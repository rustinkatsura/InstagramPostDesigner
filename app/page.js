"use client";

import { useState, useEffect } from "react";

export default function Home() {
   const [uploadedPhotos, setUploadedPhotos] = useState([]);
   const [sequencedPhotos, setSequencedPhotos] = useState(Array(8).fill(null));
   const [draggedItem, setDraggedItem] = useState(null);
   const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

   const handleFileUpload = (files) => {
      const newPhotos = Array.from(files).map((file, index) => ({
         id: Date.now() + index,
         file,
         url: URL.createObjectURL(file),
         name: file.name,
      }));
      setUploadedPhotos((prev) => [...prev, ...newPhotos]);
   };

   const handleDragStart = (photo, sourceType) => {
      setDraggedItem({ photo, sourceType });
   };

   const handleDragEnd = () => {
      setDraggedItem(null);
   };

   const handleSequenceDrop = (targetIndex) => {
      if (!draggedItem) return;

      const { photo, sourceType } = draggedItem;

      if (sourceType === "upload") {
         // If dropping on an existing photo or targeting a specific index, use that index
         // Otherwise, find the next available slot
         let actualIndex = targetIndex;
         if (targetIndex === null) {
            // Find the next empty slot
            actualIndex = sequencedPhotos.findIndex((p) => p === null);
            if (actualIndex === -1) {
               // If no empty slots, don't add
               return;
            }
         }

         const newSequenced = [...sequencedPhotos];
         newSequenced[actualIndex] = photo;
         setSequencedPhotos(newSequenced);
         setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
         // Only change current index if this is the first photo being added
         if (sequencedPhotos.every(p => p === null)) {
            setCurrentPhotoIndex(actualIndex);
         }
      } else if (sourceType === "sequence") {
         const currentIndex = sequencedPhotos.findIndex(
            (p) => p?.id === photo.id
         );

         if (currentIndex === targetIndex) return; // No change needed

         // Create a compact array with only non-null photos and their original indices
         const compactPhotos = [];
         sequencedPhotos.forEach((photo, index) => {
            if (photo !== null) {
               compactPhotos.push({ photo, originalIndex: index });
            }
         });

         // Find the current and target positions in the compact array
         const compactCurrentIndex = compactPhotos.findIndex(
            (item) => item.originalIndex === currentIndex
         );
         const compactTargetIndex = compactPhotos.findIndex(
            (item) => item.originalIndex === targetIndex
         );

         if (compactCurrentIndex === -1 || compactTargetIndex === -1) return;

         // Reorder in the compact array
         const draggedItem = compactPhotos.splice(compactCurrentIndex, 1)[0];
         compactPhotos.splice(compactTargetIndex, 0, draggedItem);

         // Rebuild the sequenced photos array maintaining the original slots
         const newSequenced = Array(8).fill(null);

         // Place photos back in order, filling available slots from the beginning
         let slotIndex = 0;
         compactPhotos.forEach((item) => {
            // Find the next available slot
            while (
               slotIndex < newSequenced.length &&
               newSequenced[slotIndex] !== null
            ) {
               slotIndex++;
            }
            if (slotIndex < newSequenced.length) {
               newSequenced[slotIndex] = item.photo;
               if (item.photo.id === photo.id) {
                  setCurrentPhotoIndex(slotIndex);
               }
               slotIndex++;
            }
         });

         setSequencedPhotos(newSequenced);
      }
   };

   // Add handler for dropping anywhere in the sequence area (not on specific slot)
   const handleSequenceAreaDrop = () => {
      if (!draggedItem || draggedItem.sourceType !== "upload") return;

      // Find the next available slot
      const nextEmptyIndex = sequencedPhotos.findIndex((p) => p === null);
      if (nextEmptyIndex !== -1) {
         handleSequenceDrop(nextEmptyIndex);
      }
   };

   // Add handler for clicking gallery images to add to end of sequence
   const handleGalleryPhotoClick = (photo) => {
      // Find the next available slot
      const nextEmptyIndex = sequencedPhotos.findIndex((p) => p === null);
      if (nextEmptyIndex !== -1) {
         const newSequenced = [...sequencedPhotos];
         newSequenced[nextEmptyIndex] = photo;
         setSequencedPhotos(newSequenced);
         setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
         // Only change current index if this is the first photo being added
         if (sequencedPhotos.every(p => p === null)) {
            setCurrentPhotoIndex(nextEmptyIndex);
         }
      }
   };

   const nextPhoto = () => {
      for (let i = currentPhotoIndex + 1; i < sequencedPhotos.length; i++) {
         if (sequencedPhotos[i] !== null) {
            setCurrentPhotoIndex(i);
            break;
         }
      }
   };

   const prevPhoto = () => {
      for (let i = currentPhotoIndex - 1; i >= 0; i--) {
         if (sequencedPhotos[i] !== null) {
            setCurrentPhotoIndex(i);
            break;
         }
      }
   };

   const handleRemoveFromSequence = (photoId) => {
      const photo = sequencedPhotos.find((p) => p?.id === photoId);
      if (photo) {
         setSequencedPhotos((prev) =>
            prev.map((p) => (p?.id === photoId ? null : p))
         );
         setUploadedPhotos((prev) => [...prev, photo]);
      }
   };

   // Add keyboard navigation
   useEffect(() => {
      const handleKeyPress = (e) => {
         if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevPhoto();
         } else if (e.key === "ArrowRight") {
            e.preventDefault();
            nextPhoto();
         }
      };

      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
   }, [currentPhotoIndex, sequencedPhotos]);

   return (
      <div className="h-screen flex flex-col bg-gray-50">
         <SequenceStrip
            sequencedPhotos={sequencedPhotos}
            currentPhotoIndex={currentPhotoIndex}
            onDrop={handleSequenceDrop}
            onAreaDrop={handleSequenceAreaDrop}
            onRemove={handleRemoveFromSequence}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onNext={nextPhoto}
            onPrev={prevPhoto}
            onPhotoClick={setCurrentPhotoIndex}
         />
         <UploadArea
            uploadedPhotos={uploadedPhotos}
            onFileUpload={handleFileUpload}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onPhotoClick={handleGalleryPhotoClick}
         />
      </div>
   );
}

function SequenceStrip({
   sequencedPhotos,
   currentPhotoIndex,
   onDrop,
   onAreaDrop,
   onRemove,
   onDragStart,
   onDragEnd,
   onNext,
   onPrev,
   onPhotoClick,
}) {
   const [dragOverIndex, setDragOverIndex] = useState(null);

   const handleDragOver = (e, index) => {
      e.preventDefault();
      setDragOverIndex(index);
   };

   const handleDragLeave = () => {
      setDragOverIndex(null);
   };

   const handleDrop = (e, index) => {
      e.preventDefault();
      onDrop(index);
      setDragOverIndex(null);
   };

   const currentPhoto = sequencedPhotos[currentPhotoIndex];

   // Get all photos that exist in the sequence
   const getVisiblePhotos = () => {
      const visible = [];
      let displayNumber = 1;

      // Show all photos that exist
      for (let i = 0; i < sequencedPhotos.length; i++) {
         if (sequencedPhotos[i]) {
            visible.push({
               photo: sequencedPhotos[i],
               index: i,
               displayNumber: displayNumber,
               isCurrent: i === currentPhotoIndex,
               position: i - currentPhotoIndex,
            });
            displayNumber++;
         }
      }

      return visible;
   };

   const visiblePhotos = getVisiblePhotos();

   const handleAreaDragOver = (e) => {
      e.preventDefault();
   };

   const handleAreaDrop = (e) => {
      e.preventDefault();
      onAreaDrop();
   };

   return (
      <div
         className=" w-[100%] h-[50%] bg-gradient-to-br from-white/80 via-blue-50/60 to-purple-50/40 backdrop-blur-md border-white/20 relative overflow-hidden shadow-lg"
         onDragOver={handleAreaDragOver}
         onDrop={handleAreaDrop}
      >
         <h2 className="text-5xl font-bold text-center text-gray-800 font-serif italic pt-[20px]">
            Design your Instagram post
         </h2>

         {/* Main Carousel View */}
         <div className="flex items-center px-[30px] relative overflow-x-auto scroll-smooth pt-[100px]">
            {/* All Visible Photos - Side by Side Layout */}
            <div className="flex items-center gap-2 transition-transform duration-700 ease-in-out min-w-max mx-auto">
               {visiblePhotos.map(({ photo, index, displayNumber, isCurrent }) => (
                  <div
                     key={index}
                     className="flex-shrink-0 transform transition-all duration-700 ease-in-out cursor-pointer hover:opacity-75"
                     onClick={() => onPhotoClick(index)}
                  >
                     <div
                        className={`relative group ${
                           dragOverIndex === index ? "ring-4 ring-blue-500" : ""
                        }`}
                        onDragOver={(e) => {
                           e.preventDefault();
                           setDragOverIndex(index);
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                           e.preventDefault();
                           onDrop(index);
                           setDragOverIndex(null);
                        }}
                     >
                        <img
                           src={photo.url}
                           alt={photo.name}
                           className="w-side-image h-side-image object-cover rounded-15 shadow-lg cursor-move transition-all duration-300"
                           draggable
                           onDragStart={() => onDragStart(photo, "sequence")}
                           onDragEnd={onDragEnd}
                        />

                        {/* Photo Number Badge */}
                        <div
                           className={`absolute -top-3 -right-3 text-white text-sm rounded-15 w-8 h-8 flex items-center justify-center font-bold shadow-lg ${
                              isCurrent
                                 ? "bg-gradient-to-r from-blue-600 to-purple-600"
                                 : "bg-gray-700"
                           }`}
                        >
                           {displayNumber}
                        </div>

                        {/* Remove Button */}
                        {isCurrent && (
                           <button
                              onClick={() => onRemove(photo.id)}
                              className="absolute -top-2 -left-2 bg-red-500 text-white rounded-15 w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                           >
                              ×
                           </button>
                        )}
                     </div>
                  </div>
               ))}

            </div>

            {/* Navigation Arrows */}
            {(() => {
               // Check if there's a previous photo
               let hasPrev = false;
               for (let i = currentPhotoIndex - 1; i >= 0; i--) {
                  if (sequencedPhotos[i] !== null) {
                     hasPrev = true;
                     break;
                  }
               }
               return hasPrev ? (
                  <button
                     onClick={onPrev}
                     className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                  >
                     <svg
                        className="w-6 h-6 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M15 19l-7-7 7-7"
                        />
                     </svg>
                  </button>
               ) : null;
            })()}

            {(() => {
               // Check if there's a next photo
               let hasNext = false;
               for (
                  let i = currentPhotoIndex + 1;
                  i < sequencedPhotos.length;
                  i++
               ) {
                  if (sequencedPhotos[i] !== null) {
                     hasNext = true;
                     break;
                  }
               }
               return hasNext ? (
                  <button
                     onClick={onNext}
                     className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                  >
                     <svg
                        className="w-6 h-6 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                     >
                        <path
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           strokeWidth={2}
                           d="M9 5l7 7-7 7"
                        />
                     </svg>
                  </button>
               ) : null;
            })()}
         </div>

         {/* Bottom Timeline Dots */}
         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
            {sequencedPhotos.map((photo, index) => (
               <button
                  key={index}
                  onClick={() => photo && onPhotoClick(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                     photo
                        ? index === currentPhotoIndex
                           ? "bg-blue-600 scale-125"
                           : "bg-blue-300 hover:bg-blue-400"
                        : "bg-gray-300"
                  }`}
               />
            ))}
         </div>
      </div>
   );
}

function UploadArea({
   uploadedPhotos,
   onFileUpload,
   onDragStart,
   onDragEnd,
   onPhotoClick,
}) {
   const [isDragOver, setIsDragOver] = useState(false);

   const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragOver(true);
   };

   const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragOver(false);
   };

   const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
         onFileUpload(files);
      }
   };

   const handleFileSelect = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
         onFileUpload(files);
      }
   };

   return (
      <div className="h-1/2 bg-gray-50 p-6">
         <h2 className="text-xl font-semibold mb-4 text-center">
            Upload Photos
         </h2>

         {uploadedPhotos.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors border-gray-300 bg-white">
               <div className="text-gray-500">
                  <label className="inline-block px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600">
                     Choose Files
                     <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                     />
                  </label>
               </div>
            </div>
         ) : (
            <div className="flex flex-wrap max-h-64 overflow-y-auto" style={{gap: '3px'}}>
               <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-15 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <input
                     type="file"
                     multiple
                     accept="image/*"
                     className="hidden"
                     onChange={handleFileSelect}
                  />
               </label>
               {uploadedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                     <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-24 h-24 object-cover rounded-15 cursor-pointer hover:opacity-75 transition-opacity"
                        style={{margin: '0.5px'}}
                        draggable
                        onDragStart={() => onDragStart(photo, "upload")}
                        onDragEnd={onDragEnd}
                        onClick={() => onPhotoClick(photo)}
                     />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}
