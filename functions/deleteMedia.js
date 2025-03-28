const fs = require("fs");
const path = require("path");

const deleteRemovedMedia = async (images = [], videos = []) => {
  const deleteFile = (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${filePath}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error);
    }
    return false;
  };

  for (const img of images) {
    // Delete from main directory
    deleteFile(path.join("./public/uploads/users", img));

    // Delete thumbnail if exists
    deleteFile(path.join("./public/low", img));

    // Optional: Delete webp version if exists
    const webpFile = img.replace(/\.[^/.]+$/, ".webp");
    deleteFile(path.join("./public/uploads/users", webpFile));
  }

  // Process videos (only from videos directory)
  for (const vid of videos) {
    deleteFile(path.join("./public/uploads/videos", vid));
  }
};

module.exports = deleteRemovedMedia;
