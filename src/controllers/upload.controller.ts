import cloudinary from '../claudinaryConfig';

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
) => {
  const base64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = `data:${file.mimetype};base64,${base64}`;

  const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
    folder: folder,
  });

  return {
    url: cloudinaryResponse.secure_url,
    fileName: file.originalname,
  };
};
