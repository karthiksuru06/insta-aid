import sys
import re

file_path = 'c:/jothsna/2025YearlyProject-Team8/i18n/index.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

translations = {
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

new_lines = []
current_lang = None
target_next_line = False

for line in lines:
    new_lines.append(line)
    
    # Try capturing language block
    for lang in translations:
        # e.g.: 'en-US': {  or  kn: {
        if re.search(rf'[\'"]?{lang}[\'"]?:\s*{{', line):
            current_lang = lang
            break
            
    if current_lang and "translation:" in line:
        txt = translations[current_lang]
        new_lines.append(f"      allowPermissions: '{txt}',\n")
        current_lang = None

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
