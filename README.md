# ספר השירים

אתר ציבורי לספר שירים: חיפוש לפי שם, אומן, כותב, מלחין ומילים, והשמעה דרך ספוטיפיי ברקע.

## הרצה מקומית

```bash
npm install
npm run dev
```

האתר ייפתח בכתובת שמופיעה בטרמינל, בדרך כלל `http://127.0.0.1:5173/`.

## חיבור ספוטיפיי

1. צרו אפליקציה ב-[Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. בהגדרות האפליקציה הוסיפו Redirect URI:
   - לפיתוח מקומי: `http://127.0.0.1:5173/` וגם `http://localhost:5173/`
   - לאתר ב-GitHub Pages: `https://USER.github.io/REPO/`
3. העתיקו את ה-Client ID והדביקו אותו במסך **הגדרות** באתר, או שימו אותו ב-`.env`:

```
VITE_SPOTIFY_CLIENT_ID=your_client_id
```

ההשמעה עובדת כמו שלט: האתר נשאר פתוח, והשיר מתנגן באפליקציית ספוטיפיי ברקע. צריך שספוטיפיי תהיה פתוחה במכשיר, ובדרך כלל נדרש Spotify Premium לשיר מלא.

## פרסום ב-GitHub Pages

1. העלו את הפרויקט ל-GitHub.
2. ב-Settings של הריפו: Pages → Source → GitHub Actions.
3. אופציונלי: הוסיפו secret בשם `VITE_SPOTIFY_CLIENT_ID`.
4. אחרי push ל-`main`, האתר יתפרסם אוטומטית.

## שמירת שירים

הספר נטען מ-`public/songs.json` ב-GitHub, כדי שכל מכשיר יראה את אותו אוסף.

כדי **להוסיף או לערוך** שירים לכל העולם, הדביקו בהגדרות Fine-grained token עם הרשאת Contents: Read and write לריפו. בלי אסימון אפשר רק לצפות.
