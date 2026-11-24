import { useContext } from "react";

import { UploadContext } from "./UploadContext.js";


export function useUpload(){

  return useContext(UploadContext);

}