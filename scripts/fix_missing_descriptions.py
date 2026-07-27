#!/usr/bin/env python3
"""
Add description fields to all agent source YAML files in custom-modes/agents/.

For each .yaml file, derives a description from the roleDefinition field and
inserts it after the 'name:' line.
"""

import os
import re
import glob
import sys

AGENTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'custom-modes', 'agents')


def derive_description(role_definition: str) -> str:
    """
    Derive a concise description from the roleDefinition string.

    Rules:
    - Take the first sentence
    - Remove "You are an " or "You are a " prefix
    - Keep under 120 characters
    - Sentence case, no trailing period
    - Make it unique and descriptive
    """
    # Get the first sentence
    # First, handle em-dash cases: "You are the X — the Y."
    # We want to capture the full description
    text = role_definition.strip()

    # Split into sentences (handle various sentence endings)
    # Look for period, exclamation, question mark followed by space or end
    sentences = re.split(r'(?<=[.!?])\s+', text)
    first_sentence = sentences[0].strip() if sentences else text

    # Remove trailing punctuation for processing
    first_sentence = first_sentence.rstrip('.!?')

    # Remove "You are an " or "You are a " or "You are " prefix (case insensitive)
    prefix_patterns = [
        r'^You are an\s+',
        r'^You are a\s+',
        r'^You are\s+',
    ]
    for pattern in prefix_patterns:
        if re.match(pattern, first_sentence, re.IGNORECASE):
            first_sentence = re.sub(pattern, '', first_sentence, flags=re.IGNORECASE)
            break

    # Handle "the X — the Y" pattern after "You are" removal
    # e.g., "the Hive-Mind Orchestrator and Stuck-State Recovery Specialist."
    # Already looks good after prefix removal

    # Ensure we start with a capital letter
    if first_sentence and first_sentence[0].islower():
        first_sentence = first_sentence[0].upper() + first_sentence[1:]

    # Trim to under 120 characters
    if len(first_sentence) > 120:
        # Try to cut at the last space before 120
        truncated = first_sentence[:117]
        last_space = truncated.rfind(' ')
        if last_space > 30:  # Only cut at a word boundary if it's reasonable
            first_sentence = first_sentence[:last_space]
        else:
            first_sentence = truncated

    first_sentence = first_sentence.strip()

    # Remove any trailing period that might remain
    first_sentence = first_sentence.rstrip('.')

    return first_sentence


def process_file(filepath: str) -> bool:
    """Process a single YAML file. Returns True if modified."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Check if description already exists
    for line in lines:
        if line.strip().startswith('description:'):
            print(f"  SKIP (already has description): {filepath}")
            return False

    # Find name: line and roleDefinition: line
    name_line_idx = None
    role_def_line = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('name:'):
            name_line_idx = i
        elif stripped.startswith('roleDefinition:'):
            # Get the full roleDefinition, which may span multiple lines
            role_def_value = stripped[len('roleDefinition:'):].strip()
            # Remove leading/trailing quotes
            role_def_value = role_def_value.strip('"\'')
            role_def_line = role_def_value
            # If roleDefinition value continues on next lines (quoted multiline),
            # we need to handle it, but for most files it's a single line
            if role_def_value == '' or role_def_value.endswith('\\'):
                # Multiline - collect continuation
                j = i + 1
                while j < len(lines):
                    cont = lines[j].strip()
                    if cont.startswith('groups:') or cont.startswith('customInstructions:'):
                        break
                    if cont and not cont.startswith('#') and not cont.startswith('  '):
                        break
                    # Handle continuation lines in quotes
                    role_def_line += ' ' + cont.strip().strip('"\'')
                    j += 1
            break

    if name_line_idx is None:
        print(f"  ERROR: No 'name:' found in {filepath}")
        return False

    if role_def_line is None:
        print(f"  ERROR: No 'roleDefinition:' found in {filepath}")
        return False

    description = derive_description(role_def_line)

    # Determine where to insert the description line
    # Insert after the name: line
    insert_idx = name_line_idx + 1

    # Build indentation for the description line
    name_line = lines[name_line_idx]
    indent = ''
    for ch in name_line:
        if ch == ' ':
            indent += ch
        else:
            break

    desc_line = f"{indent}description: {description}\n"

    # Insert the description line
    new_lines = lines[:insert_idx] + [desc_line] + lines[insert_idx:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"  OK: {os.path.relpath(filepath, AGENTS_DIR)} -> \"{description}\"")
    return True


def main():
    yaml_files = []
    for root, dirs, files in os.walk(AGENTS_DIR):
        for f in files:
            if f.endswith('.yaml') or f.endswith('.yml'):
                yaml_files.append(os.path.join(root, f))

    yaml_files.sort()
    print(f"Found {len(yaml_files)} YAML files in {AGENTS_DIR}")

    modified = 0
    skipped = 0
    errors = 0

    for filepath in yaml_files:
        try:
            if process_file(filepath):
                modified += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ERROR processing {filepath}: {e}")
            errors += 1

    print(f"\nDone. Modified: {modified}, Skipped: {skipped}, Errors: {errors}")
    return 0 if errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
