NaFunny HUB 1.2.1 Logo Fix

What it fixes:
- NaFunny logo color jumps during theme switching
- visible rectangular gradient during animation
- missing / uncolored tail of the letter y
- desktop clipping and Safari/iPhone animation flicker

Install:
1. Copy nafunny-logo-fix.css into the END of your main CSS file.
2. Find the NaFunny logo text in index.html.
3. Change it to:

<h1 class="nafunny-logo-fixed" data-text="NaFunny">NaFunny</h1>

If the old element already has classes, keep them if needed, but add nafunny-logo-fixed.
Example:
<h1 class="hero-title nafunny-logo-fixed" data-text="NaFunny">NaFunny</h1>

Important:
Remove/disable old logo animation rules that animate background-position or background-size on the logo text.
The new fix keeps the logo gradient static and animates only a separate shine layer.
