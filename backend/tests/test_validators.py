import pytest

from app.utils.validators import normalize_email, normalize_full_name, validate_password_strength


@pytest.mark.parametrize("bad", ["short1", "abcdefgh", "12345678", "a1" * 65])
def test_weak_passwords_rejected(bad):
    with pytest.raises(ValueError):
        validate_password_strength(bad)


def test_good_password_accepted():
    assert validate_password_strength("Str0ngPass!") == "Str0ngPass!"


def test_full_name_is_cleaned_and_validated():
    assert normalize_full_name("  Asha   Verma ") == "Asha Verma"
    for bad in ["", "   ", "Bad\x00Name", "x" * 151]:
        with pytest.raises(ValueError):
            normalize_full_name(bad)


def test_email_normalised():
    assert normalize_email("  Asha@Example.COM ") == "asha@example.com"
