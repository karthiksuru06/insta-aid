"""Script to add translations for permissions."""

import sys
from typing import Dict

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')  # type: ignore

def main() -> None:
    """Main execution function."""
    file_path: str = 'c:/jothsna/2025YearlyProject-Team8/i18n/index.ts'

    text: str = ""
    with open(file_path, 'r', encoding='utf-8') as f:
        text = str(f.read())

    translations: Dict[str, str] = {
        'en-US': 'Allow Permissions',
        'kn': 'ಅನುಮತಿಗಳನ್ನು ನೀಡಿ',
        'te': 'అనుమతులను ఇవ్వండి',
        'en-UK': 'Allow Permissions',
        'hi': 'अनुमतियां दें',
        'mr': 'परवानग्या द्या',
        'gu': 'પરવાનગીઓ આપો',
        'ta': 'அனுமதிகளை வழங்கு',
        'bn': 'অনুমতি দিন',
        'ml': 'അനുമതികൾ നൽകുക'
    }

    for lang, txt in translations.items():
        # Look for the language dictionary header and then the translation dictionary header.
        # Try different lang key formats safely.
        lang_idx: int = text.find(f"'{lang}': {{")
        if lang_idx == -1:
            lang_idx = text.find(f'"{lang}": {{')
        if lang_idx == -1:
            lang_idx = text.find(f"{lang}: {{")

        if lang_idx != -1:
            # find the exact "translation: {" after lang_idx
            trans_idx: int = text.find("translation: {", lang_idx)
            if trans_idx != -1:
                # We want to insert right after the "{"
                brace_pos: int = trans_idx + len("translation: {")
                # Create the string to insert
                insertion: str = f"\n      allowPermissions: '{txt}',"
                text = text[:brace_pos] + insertion + text[brace_pos:]
                print(f"Added translation for {lang}: {txt}")
            else:
                print(f"Could not find translation block for {lang}")
        else:
            print(f"Could not find language key for {lang}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)

    print("Done.")

if __name__ == "__main__":
    main()
