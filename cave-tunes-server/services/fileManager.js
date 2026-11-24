// ======================================================
// CAVE TUNES
// FILE MANAGER SERVICE
// ======================================================

const fs = require("fs");
const path = require("path");

// ======================================================
// FILE EXISTS
// ======================================================

function fileExists(filePath) {

    if (!filePath) return false;

    return fs.existsSync(filePath);

}

// ======================================================
// FILE INFO
// ======================================================

function getFileInfo(file) {

    if (!file) return null;

    return {

        originalName: file.originalname,

        filename: file.filename,

        path: file.path,

        size: file.size,

        mimeType: file.mimetype,

        extension: path.extname(file.originalname)

    };

}

// ======================================================
// PUBLIC URL
// ======================================================

function createFileUrl(filePath) {

    if (!filePath) return null;

    return "/" + filePath.replace(/\\/g, "/");

}

// ======================================================
// DELETE FILE
// ======================================================

function deleteFile(filePath) {

    try {

        if (!filePath) return;

        if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

            console.log(`🗑 Deleted ${filePath}`);

        }

    }

    catch (error) {

        console.error("Delete File Error:", error.message);

    }

}

// ======================================================
// DELETE MULTIPLE FILES
// ======================================================

function deleteFiles(files = []) {

    if (!Array.isArray(files)) return;

    files.forEach(file => {

        if (!file) return;

        if (typeof file === "string") {

            deleteFile(file);

        }

        else if (file.path) {

            deleteFile(file.path);

        }

    });

}

// ======================================================
// MOVE FILE
// ======================================================

function moveFile(oldPath, newPath) {

    try {

        fs.renameSync(oldPath, newPath);

        return true;

    }

    catch (error) {

        console.error("Move File Error:", error.message);

        return false;

    }

}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    fileExists,

    getFileInfo,

    createFileUrl,

    deleteFile,

    deleteFiles,

    moveFile

};