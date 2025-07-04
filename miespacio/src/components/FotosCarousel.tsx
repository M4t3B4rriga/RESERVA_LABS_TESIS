import React, { useEffect } from 'react';
import Fancybox from "@/src/components/Fancybox";
import { Carousel } from "react-responsive-carousel";
import { FotoEspacio } from "@/libs/fotoEspacio";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import Modal from 'react-modal';
import { useState } from "react";
import Image from 'next/image';
import styles from '@/styles/Carousel.module.css';

interface Props {
    fotosEspacio: FotoEspacio[];
}

interface FotoProps {
    imageUrl: string;
    foto: FotoEspacio;
}

const PrintPhotoCarousel: React.FC<FotoProps> = ({ imageUrl, foto }) => {
    const [src, setSrc] = useState(imageUrl);

    return (
        <a
            key={foto.CodFotoEspacio}
            data-fancybox="gallery"
            href={imageUrl}
            data-caption={foto.NombreFoto}>
            <div key={foto.CodFotoEspacio} className={styles.image}>
                <Image
                    alt={foto.NombreFoto}
                    src={src}
                    width={800}
                    height={500}
                    placeholder="blur"
                    blurDataURL='/images/placeholder/placeholder.png'
                    onError={() => setSrc('/images/descarga.jpg')}
                    className={styles.img}
                />
            </div>
        </a>
    );
};

const FancyboxModal = ({ fotosEspacio }: Props) => {
    return (
        <div>
            <Fancybox
                options={{
                    Carousel: {
                        infinite: false
                    },
                    Images: {
                        zoom: true,
                    },
                }}
            >
                {fotosEspacio.length === 0 ?
                    <div key={0} className={styles.image}>
                        <Image
                            alt={'Agregar Foto'}
                            src={"/images/descarga.jpg"}
                            width={800}
                            height={500}
                            placeholder="blur"
                            blurDataURL='/images/placeholder/placeholder.png'
                            className={styles.img}
                        />
                    </div>
                    :
                    <Carousel showArrows={true} showThumbs={false} emulateTouch={true} showStatus={false} autoPlay={true} interval={5000} transitionTime={500} >
                        {fotosEspacio.map((foto, index) => {
                            const imageUrl = foto.NombreFoto
                                ? foto.RutaFoto + foto.NombreFoto
                                : "/images/descarga.jpg";
                            return (
                                <PrintPhotoCarousel imageUrl={imageUrl} foto={foto} key={foto.CodFotoEspacio} />
                            );
                        })}
                    </Carousel>
                }
            </Fancybox>
        </div>
    );
};

export default function FotosCarousel({ fotosEspacio }: Props) {
    const [selectedFoto, setSelectedFoto] = useState<FotoEspacio>();
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [imgSrc, setImgSrc] = useState<string>('');

    const handleOpenModal = (foto: FotoEspacio) => {
        setSelectedFoto(foto);
        setModalIsOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedFoto(undefined);
        setModalIsOpen(false);
    };

    return (
        <>
            <FancyboxModal fotosEspacio={fotosEspacio} />
        </>
    );
}
