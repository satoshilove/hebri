"""Synapsek's desktop-managed provider. OAuth remains in Electron's OS store.

These internal environment values are injected only into desktop-owned local
backends. They are a process-lifetime loopback capability, never provider keys.
The server independently verifies the account, consent, plan and shared budget.
"""
from providers import register_provider
from providers.base import ProviderProfile

register_provider(ProviderProfile(
    name="synapsek", display_name="Synapsek", description="Use your shared Synapsek plan and credits",
    env_vars=("HEBRI_SYNAPSEK_BRIDGE_TOKEN", "HEBRI_SYNAPSEK_BRIDGE_URL"),
    base_url="", auth_type="api_key", fallback_models=("synapsek-auto",),
    default_max_tokens=4096, default_aux_model="synapsek-auto", supports_vision=True,
))
