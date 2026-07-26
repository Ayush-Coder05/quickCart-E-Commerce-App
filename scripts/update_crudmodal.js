const fs = require('fs');
const path = "D:\\quickCart\\components\\admin\\CrudModal.tsx";
let code = fs.readFileSync(path, 'utf8');

// Remove Image import as it's only used for preview
code = code.replace(/  Image,\r?\n/, '');

// Remove image section props interface and ImagePreview / ImageSection components
const imageSectionRegex = /\/\/ ── Image section props \(optional\) ──[\s\S]*?\/\/ ── Image section rendered at the top of the modal ──[\s\S]*?\n\}/;
code = code.replace(imageSectionRegex, '');

// Remove props fields
code = code.replace(/  \/\*\* When provided, renders the image picker section above the form fields \*\/\r?\n  imageSectionProps\?: ImageSectionProps;\r?\n  \/\*\*\r?\n   \* @deprecated Use `imageSectionProps` instead.\r?\n   \* Legacy: field key whose value is used as image URL for inline preview\.\r?\n   \*\/\r?\n  imagePreviewKey\?: string;\r?\n  \/\*\* Field key whose value is used as the emoji fallback for the preview \*\/\r?\n  emojiKey\?:\s*string;/g, '');

// Remove from function signature
code = code.replace(/  imageSectionProps,\r?\n  imagePreviewKey,\r?\n  emojiKey,/g, '');

// Remove {imageSectionProps && <ImageSection ... />} block
const imageSectionRenderRegex = /\s*\{\/\* ── Image picker section \(new, replaces inline imageUrl field\) ── \*\/\}\r?\n\s*\{imageSectionProps && \(\r?\n\s*<ImageSection \{\.\.\.imageSectionProps\} \/>\r?\n\s*\)\}/;
code = code.replace(imageSectionRenderRegex, '');

// Remove Legacy inline image preview block
const inlinePreviewRegex = /\s*\{\/\* Legacy inline image preview — only used when imagePreviewKey is set \*\/\}\r?\n\s*\{!imageSectionProps && imagePreviewKey && f\.key === imagePreviewKey && \(\r?\n\s*<View style=\{\{ marginTop: 12 \}\}>\r?\n\s*<Text style=\{previewStyles\.sectionLabel\}>Image Preview<\/Text>\r?\n\s*<ImagePreview\r?\n\s*url=\{String\(form\[imagePreviewKey\] \?\? ""\)\}\r?\n\s*emoji=\{emojiKey \? String\(form\[emojiKey\] \?\? ""\) : ""\}\r?\n\s*\/>\r?\n\s*<\/View>\r?\n\s*\)\}/;
code = code.replace(inlinePreviewRegex, '');

// Replace save button disabled prop to remove imageSectionProps reference
code = code.replace(/disabled=\{saving \|\| imageSectionProps\?\.uploading\} style=\{\[styles\.saveBtn, \(saving \|\| imageSectionProps\?\.uploading\) && \{ opacity: 0\.6 \}\]\}/g, 'disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}');

// Remove previewStyles
const previewStylesRegex = /\/\/ ── Image-section \/ preview styles ──[\s\S]*\}\);/g;
code = code.replace(previewStylesRegex, '');

fs.writeFileSync(path, code);
console.log("Done");
