import multer from 'multer';

// In-memory file storage
const storage = multer.memoryStorage();

// Accept only PDF files
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

export default upload;
