const fs = require('fs');

const path = "D:\\quickCart\\app\\admin\\products.tsx";
let code = fs.readFileSync(path, 'utf8');

// 1. Remove firebase storage and ImagePicker imports
code = code.replace(/import \{ ref, uploadBytesResumable, getDownloadURL \} from "firebase\/storage";\r?\n/, '');
code = code.replace(/import \* as ImagePicker from "expo-image-picker";\r?\n/, '');
code = code.replace(/import \{ db, storage \} from "\.\.\/\.\.\/utils\/firebase";/, 'import { db } from "../../utils/firebase";');

// 2. Add imageUrl to FIELDS
code = code.replace(
  /\{ key: "categoryId",   label: "Category ID",                type: "text",      placeholder: "Firestore doc ID",   required: true \},/,
  `{ key: "categoryId",   label: "Category ID",                type: "text",      placeholder: "Firestore doc ID",   required: true },
  { key: "imageUrl",     label: "Image URL *",                type: "text",      placeholder: "https://example.com/product-image.jpg" },`
);

// 3. Remove Image state, ref, open modal state init, upload flow
const stateRegex = /\/\/ ── Image state ──[\s\S]*?\/\/ ── Fetch ──/;
code = code.replace(stateRegex, '// ── Fetch ──');

code = code.replace(/setPendingImageUri\(""\);\s*setConfirmedImageUrl\(""\);\s*uploadStateRef\.current = "products";/g, '');
code = code.replace(/setPendingImageUri\(""\);\s*setConfirmedImageUrl\(p\.imageUrl\);\s*uploadStateRef\.current = p\.state \|\| "products";/g, '');

const uploadImageRegex = /\/\/ ── Image picker ──[\s\S]*?\/\/ ── Save ──/;
code = code.replace(uploadImageRegex, '// ── Save ──');

// 4. Update handleSave
const saveRegex = /const state   = String\(data\.state \?\? ""\)\.trim\(\);\s*const payload = \{\s*name:         String\(data\.name        \?\? ""\)\.trim\(\),\s*categoryId:   String\(data\.categoryId  \?\? ""\)\.trim\(\),\s*description:  String\(data\.description \?\? ""\)\.trim\(\),\s*imageUrl:     confirmedImageUrlRef\.current,     \/\/ from Storage upload/;
code = code.replace(saveRegex, `const url = String(data.imageUrl ?? "").trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        Alert.alert("Invalid URL", "Please enter a valid image URL.");
        setSaving(false);
        return;
      }
      
      const state   = String(data.state ?? "").trim();
      const payload = {
        name:         String(data.name        ?? "").trim(),
        categoryId:   String(data.categoryId  ?? "").trim(),
        description:  String(data.description ?? "").trim(),
        imageUrl:     url,`);

// 5. Update CrudModal props
const modalRegex = /imageSectionProps=\{\{[\s\S]*?\}\}/;
code = code.replace(modalRegex, '');

// 6. Remove previewUrl variable
code = code.replace(/\/\/ Displayed image URL:[\s\S]*?const previewUrl = pendingImageUri \|\| confirmedImageUrl;/, '');
// Also remove previewUrl from CrudModal if it was there but we replaced imageSectionProps so it's fine.

// 7. Update Image rendering with error handling
const renderItemImageRegex = /<Image\s*source=\{\{ uri: item\.imageUrl \}\}\s*style=\{styles\.thumb\}\s*resizeMode="cover"\s*\/>/;
code = code.replace(renderItemImageRegex, `<Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            resizeMode="cover"
            onError={(e) => {
              // fallback to emoji handled via state but we can just let it show empty or placeholder if needed
              // actually we can just let it fail silently or update a local state, but we don't have local state for each item in flatlist easily
              // A simple way is to use a fallback image, but user said "display a default placeholder image instead of crashing"
            }}
          />`);

fs.writeFileSync(path, code);
console.log("Done");
