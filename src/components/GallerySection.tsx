import { useState } from 'react';
import { ArrowUpRight, Eye, X } from 'lucide-react';
import { CATEGORY_LABELS, GALLERY_ITEMS } from '../data/studioData';
import type { GalleryItem, ServiceCategory } from '../types/studio';
import { FourPointStar } from './StarMotif';

type FilterCategory = 'all' | ServiceCategory;

interface GallerySectionProps {
  onSelectServiceFromGallery: (serviceId: string) => void;
}

const FILTER_TABS: Array<{ id: FilterCategory; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'cejas', label: 'Cejas' },
  { id: 'pestanas', label: 'Pestañas' },
  { id: 'depilacion', label: 'Depilación' },
];

export function GallerySection({
  onSelectServiceFromGallery,
}: GallerySectionProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const filteredItems =
    activeCategory === 'all'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeCategory);

  const countByCategory = (cat: FilterCategory) =>
    cat === 'all'
      ? GALLERY_ITEMS.length
      : GALLERY_ITEMS.filter((i) => i.category === cat).length;

  return (
    <section
      id="galeria"
      aria-labelledby="galeria-heading"
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-white/85 text-xs font-semibold tracking-wider uppercase mb-2">
            <FourPointStar className="w-3.5 h-3.5 text-white" />
            <span>Portafolio 13 STUDIO</span>
          </div>
          <h2
            id="galeria-heading"
            className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight uppercase text-balance"
          >
            Galería de trabajos reales
          </h2>
          <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl">
            Resultados limpios en cejas, pestañas punto por punto y depilación.
            Filtra por especialidad y reserva el mismo acabado.
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filtrar galería por servicio"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#082BB3]/90 border border-white/15 self-start md:self-auto"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(tab.id)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isActive
                    ? 'bg-[#FAF8F2] text-[#0B1536] shadow-sm'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label} ({countByCategory(tab.id)})
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isBroken = brokenImages[item.id];
          return (
            <article
              key={item.id}
              className="group bg-[#FAF8F2] rounded-3xl overflow-hidden flex flex-col border border-[#0B1536]/10 shadow-lg shadow-[#082BB3]/25 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[#E9E4D8] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#DF1B2D]"
                aria-label={`Ver detalle de ${item.title}`}
              >
                {!isBroken ? (
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                    }
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#FAF8F2] to-[#E6E0D0] text-[#0B1536]">
                    <FourPointStar className="w-8 h-8 text-[#0D3FE8] mb-2" />
                    <span className="font-display text-xl uppercase">
                      {item.title}
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B1536]/65 to-transparent pointer-events-none" />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F2]/95 text-[#0B1536] text-xs font-semibold shadow-sm">
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  Ampliar
                </span>
              </button>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0D3FE8]">
                    <span>{CATEGORY_LABELS[item.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#0B1536]/65 font-medium">
                      {item.serviceLabel}
                    </span>
                  </div>
                  <h3 className="mt-1.5 font-display text-2xl font-bold text-[#0B1536] tracking-tight uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-[#0B1536]/75 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#0B1536]/10 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#0B1536]/60 truncate">
                    {item.techniqueNote}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectServiceFromGallery(item.serviceId)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-xs font-bold tracking-wide inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Reservar
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox Preview Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1536]/80 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FAF8F2] text-[#0B1536] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full bg-[#E9E4D8]">
              {!brokenImages[selectedItem.id] ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <FourPointStar className="w-10 h-10 text-[#0D3FE8] mb-2" />
                  <p className="font-display text-2xl uppercase">
                    {selectedItem.title}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Cerrar vista ampliada"
                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-[#0B1536]/85 text-white flex items-center justify-center hover:bg-[#DF1B2D] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-7">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0D3FE8]">
                <span>{CATEGORY_LABELS[selectedItem.category]}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#0B1536]/70">
                  {selectedItem.serviceLabel}
                </span>
              </div>
              <h3
                id="gallery-modal-title"
                className="mt-1 font-display text-3xl font-bold uppercase text-[#0B1536]"
              >
                {selectedItem.title}
              </h3>
              <p className="mt-2 text-sm sm:text-base text-[#0B1536]/80 leading-relaxed">
                {selectedItem.description}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-[#0B1536]/65">
                Detalle técnico: {selectedItem.techniqueNote}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#0B1536]/20 text-sm font-semibold text-[#0B1536] hover:bg-[#0B1536]/5 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedItem.serviceId;
                    setSelectedItem(null);
                    onSelectServiceFromGallery(id);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#DF1B2D] hover:bg-[#C01424] text-white text-sm font-bold tracking-wide inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  Agendar este estilo
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
