'use client';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  image?: File | null;
  onRemoveImage: () => void;
}

export default function ImageUpload({ onImageSelected, image, onRemoveImage }: ImageUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div className="relative flex items-center gap-2 rounded-full bg-white px-5 py-3">
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      />
      {!image ? (
        <Upload className="h-5 w-5 text-gray-400" />
      ) : (
        <>
          <img
            src={URL.createObjectURL(image)}
            alt="Upload preview"
            className="h-5 w-5 rounded-full object-cover"
          />
          <button
            onClick={onRemoveImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
