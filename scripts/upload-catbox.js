const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

async function uploadToCatbox(filePath) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const options = {
      hostname: 'catbox.moe',
      path: '/user/api.php',
      method: 'POST',
      headers: form.getHeaders(),
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

const filePaths = [
  "C:\\Users\\ayush\\.gemini\\antigravity\\brain\\eb520db5-a492-4b00-b6cd-80cdcb153fbd\\gala_apples_1784478158700.jpg",
  "C:\\Users\\ayush\\.gemini\\antigravity\\brain\\eb520db5-a492-4b00-b6cd-80cdcb153fbd\\dashboard_freshener_1784478170227.jpg",
  "C:\\Users\\ayush\\.gemini\\antigravity\\brain\\eb520db5-a492-4b00-b6cd-80cdcb153fbd\\antifog_film_1784478181689.jpg"
];

async function run() {
  for (const fp of filePaths) {
    try {
      console.log(`Uploading ${fp}...`);
      const url = await uploadToCatbox(fp);
      console.log(`URL: ${url}`);
    } catch(err) {
      console.error(err);
    }
  }
}

run();
