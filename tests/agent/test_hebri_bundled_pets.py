"""Bundled artwork uses the real, profile-scoped pet store without downloads."""
import io

from PIL import Image

from agent.pet import bundled, constants, store


def test_bundled_artwork_frames_and_ids():
    catalog = bundled.entries()
    assert catalog
    for slug in catalog:
        path = bundled.asset(slug)
        assert path.parent == bundled.ASSETS
        with Image.open(path) as image:
            assert image.size == (constants.FRAME_W * 8, constants.FRAME_H * 9)
            assert image.mode == "RGBA"
            for row in range(9):
                frames = []
                for col in range(constants.FRAMES_PER_STATE):
                    frame = image.crop((col * 192, row * 208, (col + 1) * 192, (row + 1) * 208))
                    alpha = frame.getchannel("A")
                    assert alpha.getbbox() is not None
                    low, high = alpha.getextrema()
                    assert low == 0 and high >= 250
                    frames.append(frame.tobytes())
                assert len(set(frames)) > 1, (slug, row)
    for bad in ("../catalog", "../../outside", "hebri-unknown-cobalt", "hebri-sage-cobalt/../other"):
        assert bundled.asset(bad) is None


def test_offline_install_thumbnail_and_removal_stay_in_selected_profile(tmp_path, monkeypatch):
    from agent.pet import manifest
    def no_network(*args, **kwargs):
        raise AssertionError("Bundled adoption must work offline")
    monkeypatch.setattr(manifest, "find_entry", no_network)
    monkeypatch.setattr(store, "_http_get", no_network)
    slug = next(iter(bundled.entries()))
    source = bundled.asset(slug)
    original = source.read_bytes()
    for profile in ("a", "b", "a"):
        monkeypatch.setenv("HERMES_HOME", str(tmp_path / profile))
        if profile == "b":
            assert not store.installed_pets()
            assert not next(p for p in bundled.gallery({}) if p["slug"] == slug)["installed"]
        pet = store.install_pet(slug)
        assert pet.directory == tmp_path / profile / "pets" / slug
        assert pet.spritesheet.read_bytes() == original
        assert store.install_pet(slug) == pet
        assert next(p for p in bundled.gallery({slug: pet}) if p["slug"] == slug)["installed"]
        with Image.open(io.BytesIO(store.thumbnail_png(slug))) as thumb:
            assert thumb.size == (96, 104)
        assert store.thumbnail_png("../../outside") is None
        if profile == "b":
            assert store.remove_pet(slug)
            assert store.load_pet(slug) is None
            assert source.read_bytes() == original
    assert store.load_pet(slug).exists
