import React, { useState, useEffect } from 'react';
import Dropzone, { FileRejection } from 'react-dropzone';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/UploadPhoto.module.css';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ReactDOM from 'react-dom';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';

const IMAGE_LIMIT = 5;

interface UploadPhotosProps {
  CodEspacio: number;
}

function UploadPhotos(props: UploadPhotosProps) {
  const { CodEspacio } = props;
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [imagesUploaded, setImagesUploaded] = useState<boolean>(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const imagePathsResponse = await fetch(`/api/espacios/images?CodEspacio=${CodEspacio}`);
        const imagePaths = await imagePathsResponse.json();
        const defaultImages = await Promise.all(
          imagePaths.map(async (imagePath: any) => {
            const response = await fetch(imagePath);
            const blob = await response.blob();
            const file = new File([blob], imagePath.substring(imagePath.lastIndexOf('/') + 1));
            return file;
          })
        );
        setImagenes(defaultImages);
      } catch (error) {
        console.error(error);
        setImagenes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [CodEspacio]);

  const onDrop = (archivos: File[]) => {
    if (imagenes.length + archivos.length <= IMAGE_LIMIT) {
      setImagenes([...imagenes, ...archivos]);
    } else {
      showErrorSizeMessageInfo();
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    const nuevaImagenes = [...imagenes];
    const [imagenMovida] = nuevaImagenes.splice(result.source.index, 1);
    nuevaImagenes.splice(result.destination.index, 0, imagenMovida);
    console.log(nuevaImagenes);
    setImagenes(nuevaImagenes);
  };

  const createPortal = (index: number) => {
    const portalId = `portal-${index}`;
    let portal = document.getElementById(portalId);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = portalId;
      document.body.appendChild(portal);
    }
    return portal;
  };

  const eliminarImagen = (index: number) => {
    const nuevaImagenes = [...imagenes];
    nuevaImagenes.splice(index, 1);
    setImagenes(nuevaImagenes);
  };

  const showErrorSizeMessage = (files: FileRejection[]) => {
    let errorMessages = [];
    for (let file of files) {
      let errorMessage = file.errors.map(error => error.message).join(', ');
      errorMessages.push(`El archivo ${file.file.name} fue rechazado: ${errorMessage}`);
    }

    Store.addNotification({
      title: "Error al subir las imágenes!",
      message: errorMessages.join('\n'),
      type: "danger",
      insert: "top",
      container: "bottom-left",
      animationIn: ["animate__animated", "animate__fadeIn"],
      animationOut: ["animate__animated", "animate__fadeOut"],
      dismiss: {
        duration: 4500,
        onScreen: true,
        pauseOnHover: true,
      }
    });

    if (files.length + imagenes.length > IMAGE_LIMIT) {
      Store.addNotification({
        title: "Limite de imágenes superado!",
        message: `Lo sentimos no puede agregar más de ${IMAGE_LIMIT} imágenes.`,
        type: "info",
        insert: "top",
        container: "bottom-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3000,
          onScreen: true,
          pauseOnHover: true,
        }
      });
    }
  };

  const showErrorSizeMessageInfo = () => {
    Store.addNotification({
      title: "Limite de imágenes superado!",
      message: `Lo sentimos no puede agregar más de ${IMAGE_LIMIT} imágenes.`,
      type: "info",
      insert: "top",
      container: "bottom-left",
      animationIn: ["animate__animated", "animate__fadeIn"],
      animationOut: ["animate__animated", "animate__fadeOut"],
      dismiss: {
        duration: 3000,
        onScreen: true,
        pauseOnHover: true,
      }
    });
  };

  const handleUploadImages = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('CodEspacio', CodEspacio.toString());

      imagenes.forEach((imagen, index) => {
        data.append(`image-${index}`, imagen, imagen.name);
      });

      const response = await axios.post('/api/espacios/uploadPhotos', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        Store.addNotification({
          title: "Éxito!",
          message: `Sus imágenes fueron subidas con éxito.`,
          type: "success",
          insert: "top",
          container: "top-left",
          animationIn: ["animate__animated", "animate__fadeIn"],
          animationOut: ["animate__animated", "animate__fadeOut"],
          dismiss: {
            duration: 3000,
            onScreen: true,
            pauseOnHover: true,
          }
        });

        setImagesUploaded(true);
      } else {
        Store.addNotification({
          title: "Error",
          message: "Hubo un error al subir las imágenes.",
          type: "danger",
          insert: "top",
          container: "top-left",
          animationIn: ["animate__animated", "animate__fadeIn"],
          animationOut: ["animate__animated", "animate__fadeOut"],
          dismiss: {
            duration: 3000,
            onScreen: true,
            pauseOnHover: true,
          }
        });
      }
    } catch (error) {
      Store.addNotification({
        title: "Error!",
        message: `Ocurrió un error al subir las imágenes. ${error}`,
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 4000,
          onScreen: true,
          pauseOnHover: true,
        }
      });
    }
    setLoading(false);
  };

  return (
    <div>
      {imagesUploaded ? (
        <>
          <div className={styles.information_title}>Se subieron las siguientes imágenes</div>
          <div className={styles.photos_container}>
            <div className={styles.display_uploaded_photos}>
              {imagenes.map((imagen, i) => (
                <div key={i} className={styles.images}>
                  <img src={URL.createObjectURL(imagen)} alt="imagen" className={styles.img} />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.information_title}>Arrastra hasta {IMAGE_LIMIT} imágenes en el recuadro o haz clic para seleccionarlas</div>
          <div className={styles.photos_container}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="photos">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={styles.display_photos}
                  >
                    {imagenes.map((imagen, i) => (
                      <Draggable key={i} draggableId={i.toString()} index={i}>
                        {(provided, snapshot) => {
                          const usePortal = snapshot.isDragging;
                          const child = (
                            <div
                              className={styles.images}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <img
                                src={URL.createObjectURL(imagen)}
                                className={styles.img}
                              />
                              <button type='button'
                                className={styles.button_delete}
                                onClick={() => eliminarImagen(i)}
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          );
                          return usePortal
                            ? ReactDOM.createPortal(child, createPortal(i))
                            : child;
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <Dropzone
              onDrop={onDrop}
              maxFiles={IMAGE_LIMIT - imagenes.length}
              onDropRejected={showErrorSizeMessage}
              accept={{
                'image/png': ['.png'],
                'image/jpeg': ['.jpg', '.jpeg'],
              }}
            >
              {({ getRootProps, getInputProps }) => (
                <div className={styles.images_drop} {...getRootProps()}>
                  <input {...getInputProps()} />
                  <p>Agregar imagen</p>
                </div>
              )}
            </Dropzone>
          </div>
        </>
      )}

      {
        imagenes.length > 0 && !imagesUploaded && (
          <div className={styles.button_container}>
            {
              loading ? (
                <div className={styles.load_icon}>
                  <FontAwesomeIcon icon={faSpinner} spin />
                </div>
              ) : (
                <button type='button' onClick={handleUploadImages}>
                  <FontAwesomeIcon icon={faUpload} style={{ marginRight: '10px' }} />
                  Subir imágenes
                </button>
              )
            }
          </div>
        )
      }

    </div>
  );
}

export default UploadPhotos;