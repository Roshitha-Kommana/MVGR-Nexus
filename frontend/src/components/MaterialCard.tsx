import { Material } from '../types/index.js';
import { Download, BookOpen, FileText, Briefcase, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MaterialCardProps {
  material: Material;
}

export const MaterialCard = ({ material }: MaterialCardProps) => {
  const isPlacement = material.regulation === 'PLACEMENT';
  const isFacultyUpload = material.uploader?.role === 'educator';

  // Dynamic vertical gradients for the academic cover
  const getCoverGradient = (subject: string) => {
    const gradients = [
      'from-amber-600 via-amber-800 to-[#2A251D]',     // Academic Gold/Amber
      'from-emerald-700 via-emerald-900 to-[#142A1D]',   // Forest Green
      'from-blue-700 via-blue-900 to-[#102038]',         // Deep Blue
      'from-rose-700 via-rose-900 to-[#2B1015]',         // Burgundy
      'from-[#D4A843]/80 via-amber-900 to-[#15102D]'     // Indigo-Gold Mix
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash % gradients.length);
    return gradients[idx];
  };

  const coverGradient = getCoverGradient(material.subject);

  // Dynamic Lucide icon based on material type
  const getMaterialIcon = (type: string) => {
    if (type.includes('Placement') || type.includes('Interview')) {
      return <Briefcase size={12} />;
    }
    if (type.includes('Lab')) {
      return <FileText size={12} />;
    }
    return <BookOpen size={12} />;
  };

  // Extract a 2-3 letter abbreviation of the subject name for the cover watermark (e.g. "Database" -> "DB", "Mathematics" -> "M-I")
  const getSubjectAbbreviation = (subjectName: string) => {
    const clean = subjectName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return subjectName.substring(0, 3).toUpperCase();
  };

  const subjectAbbr = getSubjectAbbreviation(material.subject);
  const averageRatingVal = parseFloat(material.averageRating) || 0;

  return (
    <Link 
      to={`/material/${material.id}`}
      className="group block font-body bg-transparent rounded-[20px] transition-all duration-300 w-full"
    >
      <div className="flex flex-col gap-2.5">
        
        {/* Dynamic Cover Block (3:4 ratio) */}
        <div className={`w-full aspect-[3/4] rounded-2xl bg-gradient-to-br ${coverGradient} relative overflow-hidden shadow-premium group-hover:shadow-premiumHover group-hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col justify-between text-white`}>
          
          {/* Cover Watermark Lines (Stylized book binding look) */}
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/10" />
          <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/5" />
          
          {/* Top Row: Rating Badge & Save Indicator */}
          <div className="flex items-center justify-between z-10">
            {/* Rating Star Badge */}
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#D4A843] text-white font-bold text-[9px] shadow-sm leading-none">
              <Star size={9} fill="white" className="stroke-none" />
              <span>{averageRatingVal.toFixed(1)}</span>
            </div>
            
            {/* Bookmark Heart outline */}
            <div className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors duration-150">
              <Heart size={11} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Center Cover Watermark Title */}
          <div className="flex flex-col items-center justify-center flex-1 text-center py-4 select-none opacity-30 group-hover:opacity-40 transition-opacity duration-300">
            <span className="font-heading font-black text-4xl tracking-widest text-white leading-none">
              {subjectAbbr}
            </span>
            <span className="text-[8px] font-bold tracking-widest text-white uppercase mt-1">
              {material.branch}
            </span>
          </div>

          {/* Bottom Cover Label: Type and Scope */}
          <div className="space-y-1.5 z-10 border-t border-white/15 pt-2">
            <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider font-extrabold text-[#D4A843]">
              {getMaterialIcon(material.materialType)}
              <span className="truncate">{material.materialType}</span>
            </span>
            
            <div className="flex items-center justify-between text-[9px] text-white/80 font-bold leading-none">
              <span>{material.branch}</span>
              {!isPlacement && <span>Sem {material.semester}</span>}
            </div>
          </div>
        </div>

        {/* Text Details Area (Below cover) */}
        <div className="px-1 space-y-1.5">
          <h3 className="font-heading font-bold text-[12.5px] text-[#2C2518] dark:text-[#EFECE6] leading-snug group-hover:text-[#D4A843] transition-colors duration-200 line-clamp-2">
            {material.title}
          </h3>

          <div className="flex items-center justify-between">
            {/* Uploader Name */}
            <div className="flex items-center gap-1 text-[10px] text-[#8C8270] dark:text-[#A09685] font-semibold">
              <span className="truncate">by {material.uploaderName}</span>
              {isFacultyUpload && (
                <span className="px-1 rounded bg-[#D4A843]/10 text-[#D4A843] text-[7.5px] font-extrabold uppercase shrink-0">
                  FACULTY
                </span>
              )}
            </div>

            {/* Downloads count */}
            <div className="flex items-center gap-0.5 text-[#8C8270] dark:text-[#A09685] text-[9.5px] font-bold">
              <Download size={10} className="shrink-0" />
              <span>{material.downloadCount}</span>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
};

export default MaterialCard;
