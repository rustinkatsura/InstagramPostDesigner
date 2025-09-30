"use client";

import { useState, useEffect } from "react";

export default function Home() {
   const [uploadedPhotos, setUploadedPhotos] = useState([]);
   const [sequencedPhotos, setSequencedPhotos] = useState(Array(8).fill(null));
   const [draggedItem, setDraggedItem] = useState(null);
   const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
   const [zoomLevel, setZoomLevel] = useState(1);
   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
   const [uploadingPhotos, setUploadingPhotos] = useState([]);
   const [dragGhost, setDragGhost] = useState(null);
   const [dragOverZone, setDragOverZone] = useState(null);
   const [isTransitioning, setIsTransitioning] = useState(false);
   const [removingPhotoId, setRemovingPhotoId] = useState(null);
   const [photoTransition, setPhotoTransition] = useState('');

   const handleFileUpload = (files) => {
      const fileArray = Array.from(files);
      const uploadIds = fileArray.map((_, index) => Date.now() + index);

      // Add to uploading state immediately for skeleton loading
      setUploadingPhotos(uploadIds);

      // Simulate processing time and create photos
      setTimeout(() => {
         const newPhotos = fileArray.map((file, index) => ({
            id: uploadIds[index],
            file,
            url: URL.createObjectURL(file),
            name: file.name,
         }));
         setUploadedPhotos((prev) => [...prev, ...newPhotos]);
         setUploadingPhotos([]);
      }, 500);
   };

   const handleDragStart = (photo, sourceType) => {
      setDraggedItem({ photo, sourceType });
      setDragGhost({ photo, sourceType });
   };

   const handleDragEnd = () => {
      setDraggedItem(null);
      setDragGhost(null);
      setDragOverZone(null);
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
      setPhotoTransition('slide-left');
      setTimeout(() => {
         const startIndex = currentPhotoIndex === -1 ? -1 : currentPhotoIndex;
         for (let i = startIndex + 1; i < sequencedPhotos.length; i++) {
            if (sequencedPhotos[i] !== null) {
               setCurrentPhotoIndex(i);
               break;
            }
         }
         setPhotoTransition('');
      }, 150);
   };

   const prevPhoto = () => {
      setPhotoTransition('slide-right');
      setTimeout(() => {
         const startIndex = currentPhotoIndex === -1 ? sequencedPhotos.length : currentPhotoIndex;
         for (let i = startIndex - 1; i >= 0; i--) {
            if (sequencedPhotos[i] !== null) {
               setCurrentPhotoIndex(i);
               break;
            }
         }
         setPhotoTransition('');
      }, 150);
   };

   const handleRemoveFromSequence = (photoId) => {
      const photo = sequencedPhotos.find((p) => p?.id === photoId);
      if (photo) {
         setRemovingPhotoId(photoId);
         setIsTransitioning(true);

         // Animate removal
         setTimeout(() => {
            setSequencedPhotos((prev) =>
               prev.map((p) => (p?.id === photoId ? null : p))
            );
            setUploadedPhotos((prev) => [...prev, photo]);
            setRemovingPhotoId(null);
            setIsTransitioning(false);
         }, 300);
      }
   };

   const handleZoomIn = () => {
      setZoomLevel((prev) => Math.min(prev + 0.2, 2));
   };

   const handleZoomOut = () => {
      setZoomLevel((prev) => Math.max(prev - 0.2, 0.4));
   };

   const toggleSidebar = () => {
      setSidebarCollapsed((prev) => !prev);
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
      <div className="h-screen flex flex-col bg-gray-50 relative overflow-hidden">
         {/* Enhanced layered background system */}
         <div className="absolute inset-0 bg-gradient-to-br from-pink-100/40 via-purple-100/30 to-orange-100/35 pointer-events-none z-0"></div>

         {/* Layer 1: Large ambient orbs */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-pink-200/25 via-purple-200/15 to-transparent rounded-full blur-3xl pointer-events-none z-1" style={{transform: 'translate(100px, -100px)'}}></div>
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-200/25 via-orange-200/15 to-transparent rounded-full blur-3xl pointer-events-none z-1" style={{transform: 'translate(-100px, 100px)'}}></div>

         {/* Layer 2: Medium floating elements */}
         <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-300/10 to-purple-300/10 rounded-full blur-2xl pointer-events-none z-2" style={{animation: 'float 6s ease-in-out infinite'}}></div>
         <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-gradient-to-l from-orange-300/10 to-pink-300/10 rounded-full blur-2xl pointer-events-none z-2" style={{animation: 'float 8s ease-in-out infinite reverse'}}></div>

         {/* Layer 3: Small accent particles */}
         <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-xl pointer-events-none z-3" style={{animation: 'float 4s ease-in-out infinite'}}></div>
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
            onFileUpload={handleFileUpload}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            isTransitioning={isTransitioning}
            removingPhotoId={removingPhotoId}
            photoTransition={photoTransition}
         />
         <UploadArea
            uploadedPhotos={uploadedPhotos}
            uploadingPhotos={uploadingPhotos}
            sequencedPhotos={sequencedPhotos}
            onFileUpload={handleFileUpload}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onPhotoClick={handleGalleryPhotoClick}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            dragGhost={dragGhost}
         />

         {/* Floating Help Button - Always visible in bottom right */}
         <button
            onClick={toggleSidebar}
            className="absolute bottom-6 right-6 w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-full flex items-center justify-center btn-enhanced shadow-luxury hover:shadow-luxury-hover z-50"
            title="Show help & info"
         >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
         </button>
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
   onFileUpload,
   zoomLevel,
   onZoomIn,
   onZoomOut,
   isTransitioning,
   removingPhotoId,
   photoTransition,
}) {
   const [dragOverIndex, setDragOverIndex] = useState(null);
   const [dragPreview, setDragPreview] = useState(null);
   const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

   const handleDragOver = (e, index) => {
      e.preventDefault();
      setDragOverIndex(index);
      setDragPosition({ x: e.clientX, y: e.clientY });
   };

   const handleDragLeave = () => {
      setDragOverIndex(null);
   };

   const handleDrop = (e, index) => {
      e.preventDefault();
      onDrop(index);
      setDragOverIndex(null);
      setDragPreview(null);
   };

   const handleDragStartLocal = (photo, sourceType) => {
      setDragPreview({ photo, sourceType });
      onDragStart(photo, sourceType);
   };

   const handleDragEndLocal = () => {
      setDragPreview(null);
      setDragOverIndex(null);
      onDragEnd();
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
         className="w-[100%] h-[50%] relative overflow-hidden flex flex-col z-20"
         style={{
            background: `
               linear-gradient(135deg,
                  rgba(255, 255, 255, 0.25) 0%,
                  rgba(255, 255, 255, 0.15) 25%,
                  rgba(255, 255, 255, 0.05) 50%,
                  rgba(255, 255, 255, 0.15) 75%,
                  rgba(255, 255, 255, 0.25) 100%
               ),
               linear-gradient(45deg,
                  rgba(248, 113, 113, 0.08) 0%,
                  rgba(236, 72, 153, 0.08) 25%,
                  rgba(147, 51, 234, 0.08) 50%,
                  rgba(236, 72, 153, 0.08) 75%,
                  rgba(248, 113, 113, 0.08) 100%
               )
            `,
            backdropFilter: 'blur(25px) saturate(200%) brightness(120%)',
            borderImage: 'linear-gradient(45deg, rgba(249, 168, 212, 0.6), rgba(221, 160, 221, 0.6), rgba(254, 178, 178, 0.6)) 1',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: `
               0 8px 32px rgba(0, 0, 0, 0.08),
               0 4px 20px rgba(236, 72, 153, 0.15),
               inset 0 1px 2px rgba(255, 255, 255, 0.6),
               inset 0 -1px 2px rgba(0, 0, 0, 0.05)
            `
         }}
         onDragOver={handleAreaDragOver}
         onDrop={handleAreaDrop}
      >
         {/* Advanced Drag Feedback Overlay */}
         {dragPreview && (
            <div className="fixed inset-0 pointer-events-none z-50">
               {/* Connection lines to valid drop zones */}
               {typeof window !== 'undefined' && (
                  <svg className="absolute inset-0 w-full h-full">
                     {sequencedPhotos.map((photo, index) => {
                        if (!photo || index === currentPhotoIndex) return null;
                        return (
                           <line
                              key={index}
                              x1={dragPosition.x}
                              y1={dragPosition.y}
                              x2={window.innerWidth / 2 + (index - currentPhotoIndex) * 100}
                              y2={window.innerHeight * 0.3}
                              stroke={dragOverIndex === index ? "#ec4899" : "#d1d5db"}
                              strokeWidth={dragOverIndex === index ? "3" : "1"}
                              strokeDasharray="5,5"
                              className="animate-pulse"
                              opacity={dragOverIndex === index ? "0.8" : "0.3"}
                           />
                        );
                     })}
                  </svg>
               )}

               {/* Floating drag preview */}
               <div
                  className="absolute w-20 h-20 pointer-events-none transition-all duration-150"
                  style={{
                     left: dragPosition.x - 40,
                     top: dragPosition.y - 40,
                     transform: 'rotate(5deg) scale(0.8)',
                     filter: 'drop-shadow(0 10px 20px rgba(236, 72, 153, 0.3))'
                  }}
               >
                  <img
                     src={dragPreview.photo.url}
                     alt="Dragging"
                     className="w-full h-full object-cover rounded-lg border-2 border-pink-400 opacity-80"
                  />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-spin">
                     ↻
                  </div>
               </div>
            </div>
         )}

         <h2 className="text-5xl font-bold text-center bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 bg-clip-text text-transparent pt-[30px] pb-4" style={{fontFamily: 'Pacifico, cursive'}}>
            Design Your Instagram
         </h2>

         {/* Main Carousel View */}
         <div
            className="flex-1 flex items-center px-[30px] relative overflow-x-auto scroll-smooth"
            onClick={(e) => {
               // Deselect if clicking on empty space (not on an image)
               if (e.target === e.currentTarget || e.target.closest('.image-container') === null) {
                  // Set to -1 to indicate no selection
                  setCurrentPhotoIndex(-1);
               }
            }}
         >
            {/* All Visible Photos - Side by Side Layout */}
            <div className={`flex items-center gap-[10px] transition-all duration-700 ease-in-out min-w-max mx-auto ${
               isTransitioning ? 'opacity-75 scale-95' : 'opacity-100 scale-100'
            }`}>
               {visiblePhotos.length === 0 ? (
                  <label
                     className="border-3 border-dashed border-pink-300 bg-gradient-to-br from-pink-50/80 via-purple-50/60 to-orange-50/40 rounded-15 flex flex-col items-center justify-center cursor-pointer btn-enhanced shadow-luxury hover:shadow-luxury-hover backdrop-blur-sm"
                     style={{
                        width: `${280 * zoomLevel}px`,
                        height: `${280 * zoomLevel}px`,
                        borderWidth: '3px',
                        background: 'linear-gradient(135deg, rgba(252, 231, 243, 0.8), rgba(243, 232, 255, 0.6), rgba(255, 237, 213, 0.4))',
                        transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s ease',
                        transformOrigin: 'center'
                     }}
                  >
                     <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4 shadow-lg" style={{width: `${4 * zoomLevel}rem`, height: `${4 * zoomLevel}rem`, transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease', transformOrigin: 'center'}}>
                        <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: `${2 * zoomLevel}rem`, height: `${2 * zoomLevel}rem`, transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)', transformOrigin: 'center'}}>
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                     </div>
                     <div className="text-center">
                        <div className="font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 bg-clip-text text-transparent mb-2" style={{fontFamily: 'Pacifico, cursive', fontSize: `${1.25 * zoomLevel}rem`, transition: 'font-size 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)', transformOrigin: 'center'}}>
                           Start Your Post
                        </div>
                        <div className="text-gray-600 font-medium opacity-90" style={{fontSize: `${0.875 * zoomLevel}rem`, transition: 'font-size 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)', transformOrigin: 'center'}}>
                           Click to upload your first photo
                        </div>
                     </div>
                     <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                           const files = e.target.files;
                           if (files.length > 0) {
                              onFileUpload(files);
                           }
                        }}
                     />
                  </label>
               ) : (
                  visiblePhotos.map(({ photo, index, displayNumber, isCurrent }) => (
                  <div
                     key={index}
                     className={`flex-shrink-0 transform transition-all duration-700 ease-in-out cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/25 hover:-translate-y-1 ${
                        isCurrent ? 'animate-pulse scale-105 shadow-lg shadow-purple-500/10' : 'hover:opacity-90'
                     } ${
                        removingPhotoId === photo.id ? 'animate-none' : ''
                     }`}
                     onClick={() => {
                        if (isCurrent) {
                           onRemove(photo.id);
                        } else {
                           onPhotoClick(index);
                        }
                     }}
                     style={{
                        animation: removingPhotoId === photo.id
                           ? 'slideOutUp 0.3s ease-in-out forwards'
                           : isCurrent
                           ? 'breathe 2s ease-in-out infinite'
                           : photoTransition === 'slide-left'
                           ? 'slideLeft 0.3s ease-in-out'
                           : photoTransition === 'slide-right'
                           ? 'slideRight 0.3s ease-in-out'
                           : 'zoomIn 0.5s ease-out'
                     }}
                  >
                     <div
                        className={`image-container relative group transition-all duration-300 ${
                           dragOverIndex === index
                              ? "ring-4 ring-pink-400 ring-opacity-60 scale-110 shadow-2xl shadow-pink-500/40 animate-pulse"
                              : ""
                        }`}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                     >
                        {/* Drop zone indicator */}
                        {dragOverIndex === index && (
                           <div className="absolute inset-0 bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-orange-400/20 rounded-15 border-2 border-dashed border-pink-400 animate-ping"></div>
                        )}

                        {/* Magnetic snap indicator */}
                        {dragPreview && dragOverIndex === index && (
                           <div className="absolute -inset-2 border-2 border-pink-500 rounded-lg animate-pulse">
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                                 <div className="w-4 h-4 bg-pink-500 rotate-45 animate-bounce"></div>
                              </div>
                           </div>
                        )}
                        <img
                           src={photo.url}
                           alt={photo.name}
                           className={`object-cover rounded-15 cursor-move transition-all duration-500 hover:brightness-110 ${
                              isCurrent
                                 ? 'shadow-lg shadow-purple-500/12 ring-1 ring-pink-300/20 ring-offset-1 ring-offset-white/20'
                                 : 'shadow-xl hover:shadow-2xl hover:shadow-pink-400/30'
                           }`}
                           style={{
                              width: `${280 * zoomLevel}px`,
                              height: `${280 * zoomLevel}px`,
                              filter: isCurrent ? 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.1))' : 'none'
                           }}
                           draggable
                           onDragStart={() => handleDragStartLocal(photo, "sequence")}
                           onDragEnd={handleDragEndLocal}
                           title="Drag to reorder photos"
                        />

                        {/* Photo Number Badge */}
                        <div
                           className={`absolute -top-3 -right-3 text-white text-sm rounded-15 w-8 h-8 flex items-center justify-center font-bold shadow-lg transition-all duration-300 ${
                              isCurrent
                                 ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 shadow-pink-200 ring-2 ring-white ring-opacity-50 scale-110"
                                 : "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 hover:scale-105"
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
               ))
               )}

            </div>

         </div>

         {/* Bottom Controls: Zoom + Navigation */}
         <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-20">
            {/* Zoom Out Button */}
            <button
               onClick={onZoomOut}
               className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-full flex items-center justify-center btn-enhanced shadow-luxury hover:shadow-luxury-hover"
               title="Zoom out to see more photos"
            >
               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
               </svg>
            </button>

            {/* Navigation Dots */}
            <div className="flex gap-2 px-4 py-2 bg-white/70 rounded-full backdrop-blur-sm border border-pink-200 shadow-luxury hover:shadow-luxury-hover transition-all duration-300">
               {sequencedPhotos.map((photo, index) => (
                  <button
                     key={index}
                     onClick={() => photo && onPhotoClick(index)}
                     className={`w-3 h-3 rounded-full transition-all duration-300 btn-enhanced ${
                        photo
                           ? index === currentPhotoIndex
                              ? "bg-gradient-to-r from-pink-500 to-purple-500 scale-125 shadow-luxury animate-pulse"
                              : "bg-pink-300 hover:bg-pink-400 hover:scale-110 hover:shadow-md"
                           : "bg-gray-300"
                     }`}
                  />
               ))}
            </div>

            {/* Zoom In Button */}
            <button
               onClick={onZoomIn}
               className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-full flex items-center justify-center btn-enhanced shadow-luxury hover:shadow-luxury-hover"
               title="Zoom in for detailed view"
            >
               <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
               </svg>
            </button>
         </div>
      </div>
   );
}

function UploadArea({
   uploadedPhotos,
   uploadingPhotos,
   sequencedPhotos,
   onFileUpload,
   onDragStart,
   onDragEnd,
   onPhotoClick,
   sidebarCollapsed,
   onToggleSidebar,
   dragGhost,
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
      <div className="h-1/2 flex z-20 relative" style={{
         background: 'rgba(255, 255, 255, 0.75)',
         backdropFilter: 'blur(16px) saturate(150%)',
         borderImage: 'linear-gradient(90deg, #f9a8d4, #dda0dd, #fbbf24) 1',
         borderTopWidth: '2px',
         borderTopStyle: 'solid',
         boxShadow: `
            0 -4px 16px rgba(236, 72, 153, 0.08),
            0 -1px 8px rgba(147, 51, 234, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
         `
      }}>
         {/* Gallery Content */}
         <div className={`${sidebarCollapsed ? 'w-full' : 'flex-1'} p-6 transition-all duration-300`}>
            {uploadedPhotos.length === 0 ? (
               <div
                  className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-all duration-300 ${
                     isDragOver
                        ? "border-pink-500 bg-gradient-to-br from-pink-100 to-purple-100 scale-105"
                        : "border-pink-300 bg-gradient-to-br from-pink-50 to-purple-50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
               >
                  <div className="flex flex-col items-center space-y-4">
                     <div className={`w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDragOver ? "scale-110 shadow-lg" : ""
                     }`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                     </div>
                     <div>
                        <h3 className="text-lg font-medium text-gray-600 mb-2">Upload Your Photos</h3>
                        <p className="text-sm text-gray-600 mb-4">
                           {isDragOver ? "Drop your photos here!" : "Drop files here or click to browse"}
                        </p>
                        <label className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg cursor-pointer btn-enhanced shadow-luxury hover:shadow-luxury-hover font-medium">
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
               </div>
            ) : (
               <div className="flex flex-wrap max-h-64 overflow-y-auto" style={{gap: '3px'}}>
                  <label className="w-24 h-24 border-2 border-dashed border-pink-300 rounded-15 flex items-center justify-center cursor-pointer btn-enhanced shadow-luxury hover:shadow-luxury-hover bg-gradient-to-br from-pink-25 to-purple-25" title="Upload more photos">
                     <svg className="w-8 h-8 text-pink-500 hover:text-pink-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                  {/* Skeleton loaders for uploading photos */}
                  {uploadingPhotos.map((id) => (
                     <div key={`skeleton-${id}`} className="w-24 h-24 rounded-15 skeleton bg-gradient-to-br from-pink-100 to-purple-100 animate-pulse" style={{animation: 'slideInFromBottom 0.3s ease-out, skeletonPulse 1.5s ease-in-out infinite'}}>
                     </div>
                  ))}

                  {uploadedPhotos.map((photo, index) => (
                     <div
                        key={photo.id}
                        className="relative group"
                        style={{
                           animation: `slideInFromBottom 0.5s ease-out ${index * 0.1}s both`
                        }}
                     >
                        <img
                           src={photo.url}
                           alt={photo.name}
                           className="w-24 h-24 object-cover rounded-15 cursor-pointer btn-enhanced shadow-luxury hover:shadow-luxury-hover border-2 border-transparent hover:border-pink-300 hover:brightness-110"
                           style={{margin: '0.5px'}}
                           draggable
                           onDragStart={() => onDragStart(photo, "upload")}
                           onDragEnd={onDragEnd}
                           onClick={() => onPhotoClick(photo)}
                           title="Click to add to sequence • Drag to position"
                        />

                        {/* Drag indicator */}
                        {dragGhost?.photo?.id === photo.id && (
                           <div className="absolute inset-0 bg-white/50 rounded-15 flex items-center justify-center">
                              <div className="w-6 h-6 bg-pink-500 rounded-full animate-ping"></div>
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* Collapsible Sidebar */}
         {!sidebarCollapsed && (
            <div className="w-64 p-6 transform transition-all duration-300 ease-in-out z-30" style={{
               background: 'rgba(255, 255, 255, 0.85)',
               backdropFilter: 'blur(20px) saturate(180%)',
               borderLeft: '2px solid',
               borderImage: 'linear-gradient(180deg, #f9a8d4, #dda0dd, #fbbf24) 1',
               boxShadow: `
                  -4px 0 16px rgba(236, 72, 153, 0.08),
                  -2px 0 8px rgba(147, 51, 234, 0.04),
                  inset 1px 0 0 rgba(255, 255, 255, 0.4)
               `
            }}>
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-600">
                     Photo Gallery
                  </h2>
                  <button
                     onClick={onToggleSidebar}
                     className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 flex items-center justify-center btn-enhanced shadow-luxury hover:shadow-luxury-hover"
                     title="Hide sidebar"
                  >
                     <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </button>
               </div>

               <div className="space-y-4">
                  {/* Add floating decoration elements */}
                  <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-pink-200/20 to-purple-200/20 rounded-full blur-sm pointer-events-none" style={{animation: 'float 5s ease-in-out infinite'}}></div>
                  <div className="absolute bottom-20 left-4 w-8 h-8 bg-gradient-to-tl from-orange-200/20 to-pink-200/20 rounded-full blur-sm pointer-events-none" style={{animation: 'float 7s ease-in-out infinite reverse'}}></div>
                  <div className="relative p-3 rounded-lg" style={{
                     background: 'rgba(252, 231, 243, 0.4)',
                     boxShadow: 'inset 0 1px 3px rgba(236, 72, 153, 0.1)'
                  }}>
                     <h3 className="text-sm font-medium text-gray-600 mb-2">📱 Gallery Actions</h3>
                     <div className="space-y-1 text-xs text-gray-600">
                        <div>• Click photos to add to sequence</div>
                        <div>• Drag photos to reorder in view</div>
                        <div>• Use + button to upload more</div>
                     </div>
                  </div>

                  <div className="border-t border-pink-200 pt-4 relative p-3 rounded-lg" style={{
                     background: 'rgba(243, 232, 255, 0.4)',
                     boxShadow: 'inset 0 1px 3px rgba(147, 51, 234, 0.1)'
                  }}>
                     <h3 className="text-sm font-medium text-gray-600 mb-2">🎯 View Controls</h3>
                     <div className="space-y-1 text-xs text-gray-600">
                        <div>• Click current (highlighted) photo to remove</div>
                        <div>• Use zoom - / + buttons to resize view</div>
                        <div>• Click dots to navigate between photos</div>
                        <div>• Use ← → arrow keys for navigation</div>
                     </div>
                  </div>

                  <div className="border-t border-pink-200 pt-4 relative p-3 rounded-lg" style={{
                     background: 'rgba(255, 237, 213, 0.4)',
                     boxShadow: 'inset 0 1px 3px rgba(251, 191, 36, 0.1)'
                  }}>
                     <h3 className="text-sm font-medium text-gray-600 mb-2">🔢 Photo Numbers</h3>
                     <div className="space-y-1 text-xs text-gray-600">
                        <div>• Numbers auto-update when reordering</div>
                        <div>• Sequence goes 1, 2, 3... in visual order</div>
                        <div>• Current photo has gradient number badge</div>
                     </div>
                  </div>

                  <div className="border-t border-pink-200 pt-4 relative p-3 rounded-lg" style={{
                     background: 'rgba(252, 231, 243, 0.4)',
                     boxShadow: 'inset 0 1px 3px rgba(236, 72, 153, 0.1)'
                  }}>
                     <h3 className="text-sm font-medium text-gray-600 mb-2">⌨️ Keyboard Shortcuts</h3>
                     <div className="space-y-1 text-xs text-gray-600">
                        <div>• ← Left Arrow: Previous photo</div>
                        <div>• → Right Arrow: Next photo</div>
                     </div>
                  </div>

                  <div className="border-t border-pink-200 pt-4 relative p-3 rounded-lg" style={{
                     background: 'rgba(243, 232, 255, 0.4)',
                     boxShadow: 'inset 0 1px 3px rgba(147, 51, 234, 0.1)'
                  }}>
                     <h3 className="text-sm font-medium text-gray-600 mb-2">📊 Stats</h3>
                     <div className="text-xs text-gray-600">
                        Photos uploaded: {uploadedPhotos.length}
                     </div>
                     <div className="text-xs text-gray-600">
                        Photos in sequence: {sequencedPhotos.filter(p => p !== null).length}/8
                     </div>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
}
