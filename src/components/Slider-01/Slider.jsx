import { createSignal, createEffect, onCleanup } from 'solid-js';
import Gamehorizontalslide from '../Gamehorizontal-01/Gamehorizontal';
import { render } from 'solid-js/web';
import { invoke } from '@tauri-apps/api/tauri';
import './Slider.css';

const Slider = (props) => {
  const { containerClassName, imageContainerClassName, slides, filePath } = props;
  const [currentSlideIndex, setCurrentSlideIndex] = createSignal(0);
  const [lastSlideVisible, setLastSlideVisible] = createSignal(false);
  const [hoveredTitle, setHoveredTitle] = createSignal('');
  const [mousePosition, setMousePosition] = createSignal({ y: 0 });

  let scrollIntervalId;

  console.log("Rendering Slider Component");

  function cutTheDescription(description) {
    if (!description) {
      return { repackDescription: 'Deskripsi tidak tersedia', officialDescription: 'Deskripsi tidak tersedia' };
    }

    const repackIndex = description.indexOf('Fitur Repack');
    const gameDescriptionIndex = description.indexOf('\nDeskripsi Game\n');

    if (repackIndex !== -1 && gameDescriptionIndex !== -1) {
      const repackDescription = description.substring(repackIndex, gameDescriptionIndex).trim();
      const officialDescription = description.substring(gameDescriptionIndex + '\nDeskripsi Game\n'.length).trim();
      return { repackDescription, officialDescription };
    } else {
      return { repackDescription: description.trim(), officialDescription: '' };
    }
  }

  function extractDetails(description) {
    if (!description) return {
      'Genre/Tag:': 'N/A',
      Perusahaan: 'N/A',
      Bahasa: 'N/A',
      UkuranOriginal: 'N/A',
      UkuranRepack: 'N/A',
    };

    let genresTagsMatch = description.match(/Genres\/Tags:\s*([^\n]+)/);
    let companiesMatch = description.match(/Company:\s*([^\n]+)/);
    if (companiesMatch === null) {
      companiesMatch = description.match(/Companies:\s*([^\n]+)/);
    }
    const languageMatch = description.match(/Languages:\s*([^\n]+)/);
    const originalSizeMatch = description.match(/Original Size:\s*([^\n]+)/);
    const repackSizeMatch = description.match(/Repack Size:\s*([^\n]+)/);

    return {
      'Genre/Tag:': genresTagsMatch ? genresTagsMatch[1].trim() : 'N/A',
      Perusahaan: companiesMatch ? companiesMatch[1].trim() : 'N/A',
      Bahasa: languageMatch ? languageMatch[1].trim() : 'N/A',
      UkuranOriginal: originalSizeMatch ? originalSizeMatch[1].trim() : 'N/A',
      UkuranRepack: repackSizeMatch ? repackSizeMatch[1].trim() : 'N/A',
    };
  }

  const handleNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => {
      const nextIndex = prevIndex === slides.length - 1 ? prevIndex : prevIndex + 1;
      if (nextIndex === slides.length - 1) {
        clearInterval(scrollIntervalId);
      }
      return nextIndex;
    });
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prevIndex) => {
      const nextIndex = prevIndex === 0 ? 0 : prevIndex - 1;
      if (prevIndex === 0) {
        clearInterval(scrollIntervalId);
      }
      return nextIndex;
    });
  };

  const handleIntersection = (entries) => {
    entries.forEach((entry) => {
      setLastSlideVisible(entry.isIntersecting && entry.intersectionRatio === 1);
    });
  };

  createEffect(() => {
    const container = document.querySelector(`.${imageContainerClassName}`);
    if (container) {
      container.style.transition = 'transform 0.5s ease-in-out';

      const slideImage = container.querySelector('.slide img');
      if (slideImage) {
        const slideImageWidth = slideImage.offsetWidth;
        const gapSize = parseFloat(window.getComputedStyle(container).gap) * 2;
        const totalSlideWidth = slideImageWidth * 2 + gapSize;
        container.style.transform = `translateX(-${currentSlideIndex() * totalSlideWidth}px)`;
      }

      const observer = new IntersectionObserver(handleIntersection, {
        threshold: 1
      });
      const lastSlide = container.lastElementChild;
      if (lastSlide) {
        observer.observe(lastSlide);
      }

      onCleanup(() => {
        clearInterval(scrollIntervalId);
        observer.disconnect();
      });
    }
  });

  const mainContentDiv = document.querySelector('.main-content');

  function resetHorizontalSlide() {
    const horSlide = document.querySelector('.horizontal-slide');
    if (horSlide) {
      try {
        horSlide.remove();
      } catch (error) {
        console.error(error);
      }
    }
  }

  const handleMouseMove = (event) => {
    setMousePosition({ y: event.clientY });
  };

  return (
    <>
      <div className={containerClassName}>
        <div className={imageContainerClassName}>
          {slides.map((slide, index) => {
            // If no description, skip processing
            const { repackDescription, officialDescription } = slide.desc
              ? cutTheDescription(slide.desc)
              : { repackDescription: 'Deskripsi tidak tersedia', officialDescription: '' };

            const details = slide.desc
              ? extractDetails(slide.desc)
              : {
                'Genre/Tag:': 'N/A',
                Perusahaan: 'N/A',
                Bahasa: 'N/A',
                UkuranOriginal: 'N/A',
                UkuranRepack: 'N/A',
              };

            return (
              <div class="slide" key={index} style={{ position: 'relative' }} onMouseEnter={
                (
                    <div
                      class="hover-title"
                    >
                      <div class="title">{slide.title}</div>
                      <div class="detail"><strong>Genre/Tag:</strong> {details['Genre/Tags:']}</div>
                      <div class="detail"><strong>Perusahaan:</strong> {details.Companies}</div>
                      <div class="detail"><strong>Bahasa:</strong> {details.Language}</div>
                      <div class="detail"><strong>Ukuran Original:</strong> {details.OriginalSize}</div>
                      <div class="detail"><strong>Ukuran Repack:</strong> {details.RepackSize}</div>
                    </div>
                  )
              }>
                <img
                  src={slide.img}
                  alt={slide.title}
                  href-link={slide.href}
                  file-path={filePath}
                  onClick={() => {
                    invoke(`get_games_images`, { gameLink: slide.href });
                    resetHorizontalSlide();
                    render(() => (
                      <Gamehorizontalslide
                        gameTitlePromise={slide.title}
                        filePathPromise={filePath}
                        gameLinkPromise={slide.href}
                      />
                    ), mainContentDiv);
                  }}
                  onMouseEnter={() => setHoveredTitle(slide.title)}
                  onMouseLeave={() => setHoveredTitle('')}
                  onMouseMove={handleMouseMove}
                />

              </div>
            );
          })}
        </div>
      </div>

      <div className="controls-buttons">
        <button onClick={handlePrevSlide} class="scroll-button --prev" style="background-color: transparent; border: none;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-left">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 12H8m4-4-4 4 4 4"/>
            </svg>
        </button>
        <button onClick={handleNextSlide} class="scroll-button --next" style="background-color: transparent; border: none;" disabled={lastSlideVisible()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-right">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8m-4 4 4-4-4-4"/>
        </svg>

        </button>
      </div>
    </>
  );
};

export default Slider;
