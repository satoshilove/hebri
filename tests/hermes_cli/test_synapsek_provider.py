"""Real discovery, credential resolution and SDK wire contract; no paid requests."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread


def test_desktop_provider_resolves_across_homes_and_executes_tool_followup(tmp_path, monkeypatch):
    from providers import get_provider_profile
    from hermes_cli.runtime_provider import resolve_runtime_provider
    from agent.transports.chat_completions import ChatCompletionsTransport
    from openai import OpenAI

    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            assert self.path == '/v1/chat/completions'
            assert self.headers['Authorization'] == 'Bearer process-capability'
            payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            requests.append(payload)
            msg = ({'role': 'assistant', 'content': None, 'tool_calls': [
                {'id': 'tool1', 'type': 'function', 'function': {'name': 'read_file', 'arguments': '{"path":"a.txt"}'}}
            ]} if len(requests) % 2 else {'role': 'assistant', 'content': 'Read complete.'})
            out = json.dumps({'id': 'gen-test', 'object': 'chat.completion', 'created': 1, 'model': 'synapsek-auto',
                'choices': [{'index': 0, 'message': msg, 'finish_reason': 'tool_calls' if 'tool_calls' in msg else 'stop'}],
                'usage': {'prompt_tokens': 10, 'completion_tokens': 5, 'total_tokens': 15}}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(out)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    worker = Thread(target=server.serve_forever, daemon=True); worker.start()
    monkeypatch.setenv('HEBRI_SYNAPSEK_BRIDGE_URL', f'http://127.0.0.1:{server.server_port}/v1')
    monkeypatch.setenv('HEBRI_SYNAPSEK_BRIDGE_TOKEN', 'process-capability')
    try:
        for name in ('a', 'b', 'a'):
            home = tmp_path / name; home.mkdir(exist_ok=True)
            monkeypatch.setenv('HERMES_HOME', str(home))
            profile = get_provider_profile('synapsek')
            assert profile and profile.default_aux_model == 'synapsek-auto'
            runtime = resolve_runtime_provider(requested='synapsek', target_model='synapsek-auto')
            assert runtime['base_url'] == f'http://127.0.0.1:{server.server_port}/v1'
            assert runtime['api_key'] == 'process-capability'
            transport = ChatCompletionsTransport()
            messages = [{'role': 'user', 'content': 'Read a.txt'}]
            tools = [{'type': 'function', 'function': {'name': 'read_file', 'parameters': {'type': 'object', 'properties': {'path': {'type': 'string'}}}}}]
            with OpenAI(api_key=runtime['api_key'], base_url=runtime['base_url'], max_retries=0) as client:
                kwargs = transport.build_kwargs('synapsek-auto', messages, tools, provider_profile=profile,
                    base_url=runtime['base_url'], max_tokens_param_fn=lambda n: {'max_tokens': n})
                first = client.chat.completions.create(**kwargs)
                assert first.choices[0].message.tool_calls[0].function.name == 'read_file'
                messages += [first.choices[0].message.model_dump(exclude_none=True), {'role': 'tool', 'tool_call_id': 'tool1', 'content': 'safe fixture'}]
                followup = transport.build_kwargs('synapsek-auto', messages, tools, provider_profile=profile, base_url=runtime['base_url'])
                second = client.chat.completions.create(**followup)
                assert second.choices[0].message.content == 'Read complete.'
            # The generic pool may persist a source/fingerprint, never the capability.
            if (home / 'auth.json').exists():
                assert 'process-capability' not in (home / 'auth.json').read_text()
        assert len(requests) == 6
        monkeypatch.delenv('HEBRI_SYNAPSEK_BRIDGE_TOKEN')
        from hermes_cli.auth import resolve_api_key_provider_credentials
        assert not resolve_api_key_provider_credentials('synapsek')['api_key']
    finally:
        server.shutdown(); server.server_close(); worker.join()
