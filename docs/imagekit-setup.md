# ImageKit Setup

## `.env`

```env
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

## Files

- `src/config/imagekit.js` — client
- `src/services/imagekit.service.js` — upload / delete / url / auth
- `src/middleware/upload.middleware.js` — multer memory storage (5MB, jpg/png/webp)

## Usage

Company update (`PATCH /api/v1/company/:companyId`) accepts multipart field `logo`.

```js
// multipart/form-data
// fields: name?, color?, logo? (file)
```

ImageKit upload + `logo_url` save happens in `company.service.js`.
