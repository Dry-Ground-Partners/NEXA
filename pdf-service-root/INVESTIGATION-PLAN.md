# Investigation Plan - Following User's Methodology

## User's Required Approach:
1. **RESEARCH** - Understand what's happening
2. **READ/GREP** - Find actual causes
3. **IMPLEMENT FIX** - Based on research
4. **ADD LOGGING** - Verify the fix

## Current Status:

### RESEARCH ✅
- Error occurs IN WeasyPrint, not our code
- All data is correct (layouts are `int 1`)
- Template renders successfully (1.6MB HTML)
- Error: `TypeError: Layout for TextBox not handled yet`

### FINDINGS:
The error "Layout for TextBox" is a **WeasyPrint internal error**, not related to our layout field. WeasyPrint is encountering a CSS feature it doesn't support.

### NEXT STEPS:
1. Save generated HTML to file for inspection
2. Check HTML for unsupported CSS features
3. Fix or remove unsupported features
4. Add logging to confirm fix

## Hypothesis:
WeasyPrint 62.3 might not support certain CSS properties in the template. The warnings about `calc()` suggest CSS compatibility issues.

## Action Plan:
1. ✅ Add HTML saving to debug output
2. Deploy and capture the HTML
3. Inspect HTML for WeasyPrint incompatibilities
4. Remove/fix incompatible CSS
5. Test again with full logging
