import { useEffect, useState, useRef } from 'react';
import styles from '@/styles/Schedule.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Popper } from 'react-popper';
import { Formik, Form, Field, ErrorMessage, useFormikContext, FormikProps, FormikValues } from 'formik';
import * as Yup from 'yup';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import axios from 'axios';
import { useRouter } from 'next/router';

interface AvailabilityBox {
    id: number;
    dayIndex: number;
    startHour: string;
    duration: number;
}

interface InputAttributes {
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    duration: number;
}

interface LimitInputs {
    min: number;
    max: number;
}

interface DisponibilityScheduleProps {
    Espacio: number;
    isEditable: boolean;
    useRouteCodEspacio: boolean;
}

const NUMBER_HOURS = 16;
const START_HOUR = 6;
const MIN_DURATION = 29;
const MAX_DURATION = 16 * 60;

const Schedule = (props: DisponibilityScheduleProps) => {
    const { isEditable, useRouteCodEspacio } = props;
    const [CodEspacio, setCodEspacio] = useState<number>(props.Espacio);
    const [availabilityBoxes, setAvailabilityBoxes] = useState<AvailabilityBox[]>([]);
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const completeDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const containerDaysRef = useRef<HTMLDivElement>(null);
    const scheduleHeaderRef = useRef<HTMLDivElement>(null);
    const [showPopper, setShowPopper] = useState(false);
    const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
    const [selectedBox, setSelectedBox] = useState<AvailabilityBox | null>(null);
    const [inputAttributes, setInputAttributes] = useState<InputAttributes>({ startHour: 0, startMinute: 0, endHour: 0, endMinute: 0, duration: 0 });
    const [startHourLimit, setStartHourLimit] = useState<LimitInputs>({ min: START_HOUR, max: START_HOUR + NUMBER_HOURS - 1 });
    const [startMinuteLimit, setStartMinuteLimit] = useState<LimitInputs>({ min: 0, max: 59 });
    const [endHourLimit, setEndHourLimit] = useState<LimitInputs>({ min: START_HOUR, max: START_HOUR + NUMBER_HOURS - 1 });
    const [endMinuteLimit, setEndMinuteLimit] = useState<LimitInputs>({ min: 0, max: 59 });
    const [durationLimit, setDurationLimit] = useState<LimitInputs>({ min: MIN_DURATION, max: MAX_DURATION });
    const [isHourError, setIsHourError] = useState(false);
    const [CodRestriccion, setCodRestriccion] = useState<number | null>(null);
    const router = useRouter();
    const { id } = router.query;

    const fetchReloadData = async (codigoEspacio: number) => {
        try {
            const CodigoRestriccion = CodRestriccion?.toString() || '';
            const response = await axios.get('/api/espacios/uploadDisponibilityBox?CodRestriccion=' + CodigoRestriccion + '&CodEspacio=' + codigoEspacio);

            if (response.status === 200) {
                setCodRestriccion(response.data.CodRestriccion);
                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al consultar las restricciones. " + response.data.message,
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
            console.error(error);
            Store.addNotification({
                title: "Error!",
                message: `Ocurrió un error al consultar las restricciones. ${error}`,
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
    };

    useEffect(() => {
        if (useRouteCodEspacio) {
            setCodEspacio(parseInt(id as string));
            setCodRestriccion(null);
        }
    }, [id]);

    useEffect(() => {
        if (CodEspacio !== undefined) {
            fetchReloadData(CodEspacio);
            const intervalId = setInterval(() => fetchReloadData(CodEspacio), 10000);
            // Limpia el intervalo cuando el componente se desmonta o cambia
            return () => {
                clearInterval(intervalId);
            };
        }
    }, [CodEspacio]);

    const handleDayClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, dayIndex: number) => {
        const dayElement = event.currentTarget;
        const rect = dayElement.getBoundingClientRect();
        const y = event.clientY - rect.top;

        const rowHeight = dayElement.clientHeight / 24; // Dividir en 24 filas para las horas

        const startHour = '15:00';
        const duration = 45; // Duración del cuadro en minutos (ejemplo: 45 minutos)

        const newBox: AvailabilityBox = {
            id: 1,
            dayIndex,
            startHour,
            duration,
        };

        setAvailabilityBoxes([...availabilityBoxes, newBox]);

        // Guardar en la base de datos
        // Implementa la lógica para enviar newBox al servidor y almacenarlo en la base de datos
    };

    const handleScroll = () => {
        if (containerDaysRef.current && scheduleHeaderRef.current) {
            scheduleHeaderRef.current.scrollLeft = containerDaysRef.current.scrollLeft;
        }
    };

    async function handleBoxClick(event: React.MouseEvent<HTMLDivElement>, day: number) {
        const container = event.currentTarget.parentElement;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const yPosition = Math.round(event.clientY - rect.top);
        const containerHeight = container.offsetHeight;

        const pixelsByHours = containerHeight / NUMBER_HOURS;

        let { clickedHour, clickedMinute } = calculateExactTime(yPosition, pixelsByHours);

        if (clickedMinute < 29) {
            clickedMinute = 0;
        } else {
            clickedMinute = 30;
        }

        const clickedPixels = calculatePixelsByTime(clickedHour, clickedMinute, pixelsByHours);

        const duration = NUMBER_HOURS + START_HOUR - 1 === clickedHour && clickedMinute >= 30 ? 29 : 59;

        const newBox: AvailabilityBox = {
            id: availabilityBoxes.length + 1,
            dayIndex: day,
            startHour: clickedHour + ':' + clickedMinute,
            duration: duration,
        };

        const isOverlapping = availabilityBoxes.some((box) => {
            if (box && box.dayIndex === day) {
                const boxStartPixels = calculatePixelsByTime(parseInt(box.startHour.split(':')[0]), parseInt(box.startHour.split(':')[1]), pixelsByHours);
                let boxEndPixels = calculateDurationToPixels(box.duration);
                let newBoxEndPixels = calculateDurationToPixels(newBox?.duration ?? 0);
                if (boxEndPixels && newBoxEndPixels) {
                    boxEndPixels += boxStartPixels;
                    newBoxEndPixels += clickedPixels;
                } else {
                    return false;
                }
                console.log('----------------------');
                console.log('boxStartPixels', boxStartPixels);
                console.log('boxEndPixels', boxEndPixels);
                console.log('clickedPixels', clickedPixels);
                console.log('newBoxEndPixels', newBoxEndPixels);

                return (
                    (clickedPixels >= boxStartPixels && clickedPixels < boxEndPixels) ||
                    (newBoxEndPixels > boxStartPixels && newBoxEndPixels <= boxEndPixels) ||
                    (clickedPixels <= boxStartPixels && newBoxEndPixels >= boxEndPixels)
                );
            }
            return false;
        });

        if (isOverlapping) {
            console.log('El nuevo Box se sobrepone a uno existente');
            return;
        }

        setAvailabilityBoxes([...availabilityBoxes, newBox]);
        closePopper();
        console.log(availabilityBoxes);

        try {
            const data = new FormData();
            data.append('CodEspacio', CodEspacio.toString());
            data.append('Dia', newBox.dayIndex.toString());
            data.append('HoraInicio', newBox.startHour);
            data.append('Duracion', newBox.duration.toString());
            data.append('HoraFin', calculateDurationToHour(newBox.duration, newBox.startHour));
            data.append('CodRestriccion', CodRestriccion?.toString() ?? '');

            const response = await axios.post('/api/espacios/uploadDisponibilityBox', data);

            if (response.status === 200) {
                console.log(response.data.message);
                console.log(response.data.CodRestriccion);
                console.log(response.data.CodHorario);
                console.log(response.data.AvaliabilityBoxes);
                setCodRestriccion(response.data.CodRestriccion);

                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
                //buscamos el box que se acaba de agregar o editar y lo almacenamos en una nueva variable para obtener el nuevo codigo
                setTimeout(() => {
                    const newBoxAdded = response.data.AvaliabilityBoxes.find((box: AvailabilityBox) => box.dayIndex === newBox.dayIndex && box.startHour === newBox.startHour && box.duration === newBox.duration);
                    if (newBoxAdded) {
                        const event = { currentTarget: document.getElementById(`box-${newBoxAdded.id}-${newBoxAdded.dayIndex}`) } as React.MouseEvent<HTMLElement>;
                        handleAvaliability(event, newBoxAdded);
                    }
                }, 100);

                //jose
            } else {
                Store.addNotification({
                    title: "Error",
                    message: "Hubo un error al guardar la restricción. " + response.data.message,
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
                setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
            }
        } catch (error) {
            console.error(error);
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
            setAvailabilityBoxes(availabilityBoxes.filter((box) => box.id !== newBox.id));
        }
    }

    function calculateExactTime(yPosition: number, pixelsByHours: number) {
        const clickedHour = START_HOUR + Math.floor(yPosition / pixelsByHours);
        const clickedMinute = Math.round((yPosition % pixelsByHours) / (pixelsByHours / 60));

        return { clickedHour, clickedMinute };
    }

    function calculatePixelsByTime(hour: number, minute: number, pixelsByHours: number) {
        const hourPosition = hour - START_HOUR;
        const minutePosition = Math.round((minute / 60) * pixelsByHours);
        const yPosition = hourPosition * pixelsByHours + minutePosition;

        return yPosition;
    }

    function calculateTimeToPixels(data: string) {
        if (!containerDaysRef.current) {
            return;
        }
        const hour = parseInt(data.split(':')[0]);
        const minute = parseInt(data.split(':')[1]);
        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;
        const hourPosition = hour - START_HOUR;
        const minutePosition = Math.round((minute / 60) * pixelsByHours);
        const yPosition = hourPosition * pixelsByHours + minutePosition;

        return yPosition;
    }

    function calculateDurationToPixels(duration: number) {
        if (!containerDaysRef.current) {
            return;
        }
        const pixelsByHours = containerDaysRef.current?.offsetHeight / NUMBER_HOURS;
        const pixelsByDuration = Math.round((duration / 60) * pixelsByHours);

        return pixelsByDuration;
    }

    function calculateDurationToHour(duration: number, startHour: string) {
        const hour = parseInt(startHour.split(':')[0]);
        const minute = parseInt(startHour.split(':')[1]);
        const durationHour = Math.floor(duration / 60);
        const durationMinute = duration % 60;
        let newHour = hour + durationHour;
        let newMinute = minute + durationMinute;

        if (newMinute >= 60) {
            newHour += Math.floor(newMinute / 60);
            newMinute = newMinute % 60;
        }

        const newHourString = newHour.toString().padStart(2, '0');
        const newMinuteString = newMinute.toString().padStart(2, '0');
        const newHourStringFormat = newHourString + ':' + newMinuteString;

        return newHourStringFormat;
    }

    const calculateLimits = (box: AvailabilityBox) => {
        const startHour = parseInt(box.startHour.split(':')[0]);
        const startMinute = parseInt(box.startHour.split(':')[1]);
        const duration = box.duration;
        const endHour = parseInt(calculateDurationToHour(duration, box.startHour).split(':')[0]);
        const endMinute = parseInt(calculateDurationToHour(duration, box.startHour).split(':')[1]);
        const currentDay = box.dayIndex;

        const startMyBoxHour = new Date();
        startMyBoxHour.setHours(parseInt(box.startHour.split(':')[0]));
        startMyBoxHour.setMinutes(parseInt(box.startHour.split(':')[1]));
        startMyBoxHour.setSeconds(0);

        const endMyBoxHour = new Date();
        endMyBoxHour.setHours(endHour);
        endMyBoxHour.setMinutes(endMinute);
        endMyBoxHour.setSeconds(0);

        const sameDayBoxes = availabilityBoxes.filter((b) => b.dayIndex === currentDay && b.id !== box.id);

        const startHourLimits = {
            min: START_HOUR, // Valor mínimo predeterminado
            max: START_HOUR + NUMBER_HOURS - 1, // Valor máximo predeterminado
        };

        const endHourLimits = {
            min: parseInt(calculateDurationToHour(MIN_DURATION, box.startHour).split(':')[0]), // Valor mínimo predeterminado
            max: START_HOUR + NUMBER_HOURS - 1, // Valor máximo predeterminado
        };

        const startMinuteLimits = {
            min: 0, // Valor mínimo predeterminado
            max: 59, // Valor máximo predeterminado
        };

        const endMinuteLimits = {
            min: parseInt(calculateDurationToHour(MIN_DURATION, box.startHour).split(':')[1]), // Valor mínimo predeterminado
            max: 59, // Valor máximo predeterminado
        };

        const durationLimits = {
            min: 0, // Valor mínimo predeterminado
            max: MAX_DURATION, // Valor máximo predeterminado
        };

        console.log('--------------------------');

        // Actualizar los límites en base a las boxes en el mismo día
        sameDayBoxes.forEach((b) => {
            const bStartHour = parseInt(b.startHour.split(':')[0]);
            const bEndDate = calculateDurationToHour(b.duration, b.startHour);

            const startHourBox = new Date();
            startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
            startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
            startHourBox.setSeconds(0);

            const endHourBox = new Date();
            endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
            endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
            endHourBox.setSeconds(0);

            console.log('bStartHour', bStartHour);
            console.log('bEndDate', bEndDate);
            console.log('b.startHour', b.startHour);
            console.log('startBox', startHourBox);
            console.log('endBox', endHourBox);
            console.log('endHourBox.getHours()', endHourBox.getHours());
            console.log('startHourLimits', startHourLimits);
            console.log('startMyBoxHour', startMyBoxHour);
            console.log('endMyBoxHour', endMyBoxHour);

            if (startMyBoxHour > endHourBox) {
                startHourLimits.min = Math.max(startHourLimits.min, endHourBox.getHours());
                startMinuteLimits.min = Math.max(startMinuteLimits.min, startMyBoxHour.getHours() === endHourBox.getHours() ? endHourBox.getMinutes() : 0);
                const newEndHourBox = calculateDurationToHour(MIN_DURATION, box.startHour);
                console.log('newEndHourBox', newEndHourBox);
                endHourLimits.min = Math.max(endHourLimits.min, parseInt(newEndHourBox.split(':')[0]));
                endMinuteLimits.min = Math.max(endMinuteLimits.min, startMyBoxHour.getHours() === endHourBox.getHours() ? parseInt(newEndHourBox.split(':')[1]) : 0);
            } else {

            }

            /* if (bStartHour < startHour) {
                startHourLimits.min = Math.max(startHourLimits.min, bEndHour);
            }

            if (bEndHour > endHour) {
                endHourLimits.max = Math.min(endHourLimits.max, bStartHour);
            }

            if (bStartHour === startHour) {
                startMinuteLimits.min = Math.max(startMinuteLimits.min, parseInt(b.startHour.split(':')[1]) + b.duration);
            }

            if (bEndHour === endHour) {
                endMinuteLimits.max = Math.min(endMinuteLimits.max, parseInt(calculateDurationToHour(b.duration, b.startHour).split(':')[1]) - startMinute);
            } */
        });

        /*         // Actualizar el límite máximo de la duración según los límites de las horas finales
                durationLimits.max = Math.min(durationLimits.max, calculateDuration(endHourLimits.max.toString(), '20'));
         */

        console.log('startHourLimits', startHourLimits);
        console.log('startMinuteLimits', startMinuteLimits);
        console.log('endHourLimits', endHourLimits);

        console.log('endMinuteLimits', endMinuteLimits);
        /*console.log('durationLimits', durationLimits); */

        /* setStartHourLimit({ min: , max:  });
        setEndHourLimit({ min: , max:  });
        setStartMinuteLimit({ min: , max:  });
        setEndMinuteLimit({ min: , max:  });
        setDurationLimit({ min: , max:  }); */
    }

    const checkForColisions = () => {
        setIsHourError(false);
        let result = false;
        if (selectedBox) {
            const currentDay = selectedBox.dayIndex;

            const startSelBoxHour = new Date();
            startSelBoxHour.setHours(inputAttributes.startHour);
            startSelBoxHour.setMinutes(inputAttributes.startMinute);
            startSelBoxHour.setSeconds(0);

            const endSelBoxHour = new Date();
            endSelBoxHour.setHours(inputAttributes.endHour);
            endSelBoxHour.setMinutes(inputAttributes.endMinute);
            endSelBoxHour.setSeconds(0);

            const sameDayBoxes = availabilityBoxes.filter((b) => b.dayIndex === currentDay && b.id !== selectedBox.id);

            sameDayBoxes.forEach((b) => {
                const bStartHour = parseInt(b.startHour.split(':')[0]);
                const bEndDate = calculateDurationToHour(b.duration, b.startHour);

                const startHourBox = new Date();
                startHourBox.setHours(parseInt(b.startHour.split(':')[0]));
                startHourBox.setMinutes(parseInt(b.startHour.split(':')[1]));
                startHourBox.setSeconds(0);

                const endHourBox = new Date();
                endHourBox.setHours(parseInt(bEndDate.split(':')[0]));
                endHourBox.setMinutes(parseInt(bEndDate.split(':')[1]));
                endHourBox.setSeconds(0);

                if (
                    (startSelBoxHour >= startHourBox && startSelBoxHour <= endHourBox) ||
                    (endSelBoxHour >= startHourBox && endSelBoxHour <= endHourBox) ||
                    (startSelBoxHour <= startHourBox && endSelBoxHour >= endHourBox)
                ) {
                    console.log('Hay una colisión');
                    setIsHourError(true);
                    result = true;
                }
            });

            return result;
        } else {
            console.log('No hay caja seleccionada');
            return false;
        }
    }

    const handleAvaliability = (event: React.MouseEvent<HTMLElement>, selectedBox: AvailabilityBox) => {
        setReferenceElement(event.currentTarget);
        setShowPopper(true);
        setSelectedBox(selectedBox);
        handleInputAttributes(selectedBox);
        setIsHourError(false);
        /* calculateLimits(selectedBox); */
    };

    const closePopper = () => {
        setShowPopper(false);
        setReferenceElement(null);
    };

    const handleStartHourChange = (value: number, setFieldValue: FormikProps<FormikValues>["setFieldValue"], values: FormikValues) => {
        setInputAttributes((prevAttributes) => {
            const newStartHour = value;
            const newEndHour = calculateEndHour(newStartHour, prevAttributes.startMinute, prevAttributes.duration);
            const newEndMinute = calculateEndMinute(prevAttributes.startHour, prevAttributes.startMinute, newEndHour, prevAttributes.duration);
            setFieldValue("startHour", newStartHour);
            setFieldValue("endHour", newEndHour);
            setFieldValue("startMinute", prevAttributes.startMinute);
            setFieldValue("endMinute", newEndMinute);
            setFieldValue("duration", prevAttributes.duration);

            const minHour = calculateDurationToHour(MIN_DURATION, newStartHour + ':' + prevAttributes.startMinute);
            setEndHourLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: parseInt(minHour.split(':')[0]),
                };
            });
            setEndMinuteLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: newEndHour === parseInt(minHour.split(':')[0]) ? parseInt(minHour.split(':')[1]) : 0,
                };
            });

            return {
                ...prevAttributes,
                startHour: newStartHour,
                endHour: newEndHour,
                endMinute: newEndMinute,
            };
        });
    };

    const handleStartMinuteChange = (value: number, setFieldValue: FormikProps<FormikValues>["setFieldValue"], values: FormikValues) => {
        setInputAttributes((prevAttributes) => {
            let newStartMinute = value;
            let plusHour = 0;
            if (value > 59) {
                newStartMinute = 0;
                plusHour = 1;
            } else if (value < 0) {
                newStartMinute = 59;
                plusHour = -1;
            }
            const newEndHour = calculateEndHour(prevAttributes.startHour + plusHour, newStartMinute, prevAttributes.duration);
            const newEndMinute = calculateEndMinute(prevAttributes.startHour + plusHour, newStartMinute, newEndHour, prevAttributes.duration);
            setFieldValue("startHour", prevAttributes.startHour + plusHour);
            setFieldValue("startMinute", newStartMinute);
            setFieldValue("endHour", newEndHour);
            setFieldValue("endMinute", newEndMinute);
            setFieldValue("duration", prevAttributes.duration);

            const minHour = calculateDurationToHour(MIN_DURATION, (prevAttributes.startHour + plusHour) + ':' + newStartMinute);
            setEndHourLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: parseInt(minHour.split(':')[0]),
                };
            });
            setEndMinuteLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: newEndHour === parseInt(minHour.split(':')[0]) ? parseInt(minHour.split(':')[1]) : 0,
                };
            });

            return {
                ...prevAttributes,
                startHour: prevAttributes.startHour + plusHour,
                startMinute: newStartMinute,
                endHour: newEndHour,
                endMinute: newEndMinute,
            };
        });
    };

    const handleEndHourChange = (value: number, setFieldValue: FormikProps<FormikValues>["setFieldValue"], values: FormikValues) => {
        setInputAttributes((prevAttributes) => {
            const newEndHour = value;
            const newDuration = calculateDuration(prevAttributes.startHour, prevAttributes.startMinute, newEndHour, prevAttributes.endMinute);
            setFieldValue("startHour", prevAttributes.startHour);
            setFieldValue("endHour", newEndHour);
            setFieldValue("startMinute", prevAttributes.startMinute);
            setFieldValue("endMinute", prevAttributes.endMinute);
            setFieldValue("duration", newDuration);

            const minHour = calculateDurationToHour(MIN_DURATION, prevAttributes.startHour + ':' + prevAttributes.startMinute);
            setEndHourLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: parseInt(minHour.split(':')[0]),
                };
            });
            setEndMinuteLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: newEndHour === parseInt(minHour.split(':')[0]) ? parseInt(minHour.split(':')[1]) : 0,
                };
            });

            return {
                ...prevAttributes,
                endHour: newEndHour,
                duration: newDuration,
            };
        });
    };

    const handleEndMinuteChange = (value: number, setFieldValue: FormikProps<FormikValues>["setFieldValue"], values: FormikValues) => {
        setInputAttributes((prevAttributes) => {
            let newEndMinute = value;
            let plusHour = 0;
            if (value > 59) {
                newEndMinute = 0;
                plusHour = 1;
            } else if (value < 0) {
                newEndMinute = 59;
                plusHour = -1;
            }
            const newDuration = calculateDuration(prevAttributes.startHour, prevAttributes.startMinute, prevAttributes.endHour + plusHour, newEndMinute);
            setFieldValue("startHour", prevAttributes.startHour);
            setFieldValue("endHour", prevAttributes.endHour + plusHour);
            setFieldValue("startMinute", prevAttributes.startMinute);
            setFieldValue("endMinute", newEndMinute);
            setFieldValue("duration", newDuration);
            return {
                ...prevAttributes,
                endHour: prevAttributes.endHour + plusHour,
                endMinute: newEndMinute,
                duration: newDuration,
            };
        });
    };

    const handleDurationChange = (value: number, setFieldValue: FormikProps<FormikValues>["setFieldValue"], values: FormikValues) => {
        setInputAttributes((prevAttributes) => {
            const newDuration = value;
            const newEndHour = calculateEndHour(prevAttributes.startHour, prevAttributes.startMinute, newDuration);
            const newEndMinute = calculateEndMinute(prevAttributes.startHour, prevAttributes.startMinute, newEndHour, newDuration);
            setFieldValue("startHour", prevAttributes.startHour);
            setFieldValue("startMinute", prevAttributes.startMinute);
            setFieldValue("endHour", newEndHour);
            setFieldValue("endMinute", newEndMinute);
            setFieldValue("duration", newDuration);

            const minHour = calculateDurationToHour(MIN_DURATION, prevAttributes.startHour + ':' + prevAttributes.startMinute);
            setEndHourLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: parseInt(minHour.split(':')[0]),
                };
            });
            setEndMinuteLimit((prevLimit) => {
                return {
                    ...prevLimit,
                    min: newEndHour === parseInt(minHour.split(':')[0]) ? parseInt(minHour.split(':')[1]) : 0,
                };
            });

            return {
                ...prevAttributes,
                endHour: newEndHour,
                endMinute: newEndMinute,
                duration: newDuration,
            };
        });
    };

    const calculateEndHour = (startHour: number, startMinute: number, duration: number) => {
        const totalMinutes = startHour * 60 + startMinute + duration;
        return Math.floor(totalMinutes / 60);
    };

    const calculateEndMinute = (startHour: number, startMinute: number, endHour: number, duration: number) => {
        const totalMinutes = startHour * 60 + startMinute + (endHour - startHour) * 60 + duration;
        return totalMinutes % 60;
    };

    const calculateDuration = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
        const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        return totalMinutes;
    };

    const validationSchema = Yup.object().shape({
        startHour: Yup.number()
            .integer('La hora debe ser un número entero positivo')
            .min(startHourLimit.min, `La hora no puede ser menor a ${startHourLimit.min}h`)
            .max(startHourLimit.max, `La hora no puede ser mayor a ${startHourLimit.max}h`)
            .required('Este campo es requerido'),
        startMinute: Yup.number()
            .integer('La hora inicial debe ser un número entero positivo')
            .min(startMinuteLimit.min, `La hora no puede ser menor a ${startMinuteLimit.min}m`)
            .max(startMinuteLimit.max, `La hora no puede ser mayor a ${startMinuteLimit.max}m`)
            .required('Este campo es requerido'),
        endHour: Yup.number()
            .integer('La hora final debe ser un número entero positivo')
            .min(endHourLimit.min, `La hora no puede ser menor a ${endHourLimit.min}h`)
            .max(endHourLimit.max, `La hora no puede ser mayor a ${endHourLimit.max}h`)
            .required('Este campo es requerido'),
        endMinute: Yup.number()
            .integer('La hora final debe ser un número entero positivo')
            .min(endMinuteLimit.min, `La hora no puede ser menor a ${endMinuteLimit.min}m`)
            .max(endMinuteLimit.max, `La hora no puede ser mayor a ${endMinuteLimit.max}m`)
            .required('Este campo es requerido'),
        duration: Yup.number()
            .integer('Debe ingresar número entero positivo')
            .min(durationLimit.min, `No puede ser menor a ${durationLimit.min}m`)
            .max(durationLimit.max, `No puede ser mayor a ${durationLimit.max}m`)
            .required('Este campo es requerido'),
    });

    const initialValues = {
        startHour: START_HOUR,
        startMinute: 0,
        endHour: START_HOUR,
        endMinute: 0,
        duration: 0,
    };

    const saveChange = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
        setSubmitting(true);
        if (!checkForColisions() && selectedBox) {

            resetForm();
            closePopper();
            const oldAvaliabilityBoxes = availabilityBoxes;
            const updatedBoxes = availabilityBoxes.map((box) => {
                if (box.id === selectedBox?.id) {
                    return {
                        ...box,
                        startHour: inputAttributes.startHour + ':' + inputAttributes.startMinute,
                        duration: inputAttributes.duration,
                    };
                }
                return box;
            });

            setAvailabilityBoxes(updatedBoxes);

            try {
                const data = new FormData();
                console.log('CodRestriccion: ' + CodRestriccion);
                data.append('CodEspacio', CodEspacio.toString());
                data.append('CodRestriccion', CodRestriccion?.toString() || '');
                data.append('Id', selectedBox?.id.toString());
                data.append('Dia', selectedBox?.dayIndex.toString() || '');
                data.append('HoraInicio', inputAttributes.startHour + ':' + inputAttributes.startMinute);
                data.append('Duracion', inputAttributes.duration.toString());
                data.append('HoraFin', inputAttributes.endHour + ':' + inputAttributes.endMinute);

                const response = await axios.put('/api/espacios/uploadDisponibilityBox', data);

                if (response.status === 200) {
                    console.log(response.data.message);
                    console.log(response.data.AvaliabilityBoxes);
                    setCodRestriccion(response.data.CodRestriccion);
                    setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
                } else {
                    Store.addNotification({
                        title: "Error",
                        message: "Hubo un error al guardar la restricción. " + response.data.message,
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
                    setAvailabilityBoxes(oldAvaliabilityBoxes);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Error!",
                    message: `Ocurrió un error al guardar. ${error}`,
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
                // se revierte el cambio en el box
                setAvailabilityBoxes(oldAvaliabilityBoxes);
            }
        }
        setSubmitting(false);
    };

    const handleInputAttributes = (selectedBox: AvailabilityBox) => {
        if (selectedBox) {
            setInputAttributes({
                startHour: parseInt(selectedBox?.startHour.split(':')[0]),
                startMinute: parseInt(selectedBox?.startHour.split(':')[1]),
                endHour: parseInt(calculateDurationToHour(selectedBox?.duration, selectedBox?.startHour).split(':')[0]),
                endMinute: parseInt(calculateDurationToHour(selectedBox?.duration, selectedBox?.startHour).split(':')[1]),
                duration: selectedBox?.duration ?? 0,
            });
        }
    }

    const deleteBox = async () => {
        if (selectedBox) {
            const oldAvaliabilityBoxes = availabilityBoxes;
            setAvailabilityBoxes((prevBoxes) => prevBoxes.filter((box) => box.id !== selectedBox.id));
            closePopper();

            try {
                const CodigoRestriccion = CodRestriccion?.toString() || '';
                const response = await axios.delete('/api/espacios/uploadDisponibilityBox?CodRestriccion=' + CodigoRestriccion + '&Id=' + selectedBox?.id + '&CodEspacio=' + CodEspacio);

                if (response.status === 200) {
                    console.log(response.data.message);
                    console.log(response.data.AvaliabilityBoxes);
                    setCodRestriccion(response.data.CodRestriccion);
                    setAvailabilityBoxes(response.data.AvaliabilityBoxes !== undefined ? response.data.AvaliabilityBoxes as AvailabilityBox[] : []);
                } else {
                    Store.addNotification({
                        title: "Error",
                        message: "Hubo un error al eliminar la restricción. " + response.data.message,
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
                    setAvailabilityBoxes(oldAvaliabilityBoxes);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Error!",
                    message: `Ocurrió un error al eliminar. ${error}`,
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
                // se revierte el cambio en el box
                setAvailabilityBoxes(oldAvaliabilityBoxes);
            }
        }
    };

    return (
        <div>
            <div className={styles.schedule_grand_container}>
                <div className={styles.schedule_container_header}>
                    <div className={styles.schedule_header}>
                        <div className={styles.hours_header}>
                            <div className={styles.hour_header}></div>
                        </div>
                        <div className={styles.days_header_container}>
                            <div className={styles.days_header} ref={scheduleHeaderRef}>
                                <div className={styles.general_hseparator_noborder}></div>
                                {days.map((day, index) => (
                                    <div key={'hday-' + index} className={styles.hday}>
                                        <span key={'hspan-' + index}>{day}</span>
                                    </div>
                                ))}
                                <div className={styles.scroll_space}></div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.schedule_header}>
                        <div className={styles.hours_header}>
                            <div className={styles.hour_header}></div>
                        </div>
                        <div className={styles.days_header_container}>
                            <div className={styles.days_header}>
                                <div className={styles.general_hseparator}></div>
                                {days.map((day, index) => (
                                    <div key={'dseparator-' + index} className={`${styles.hday} ${styles.day_separator}`}>
                                        <span key={'dspan-' + index}></span>
                                    </div>
                                ))}
                                <div className={styles.scroll_space}></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.schedule_body}>
                    <div className={styles.container_body}>
                        <div className={styles.hours_body}>
                            {Array.from(Array(NUMBER_HOURS).keys()).map((hour, index) => {
                                const displayHour = hour + START_HOUR;
                                return (
                                    <div key={'hour-' + index} className={styles.hour}>
                                        <span>{displayHour}:00</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={styles.container_days} onScroll={handleScroll} ref={containerDaysRef}>
                            <div className={styles.days_body}>
                                <div aria-hidden="true" className={styles.hour_separator}>
                                    {Array.from(Array(NUMBER_HOURS).keys()).map((hour, index) => (
                                        <div key={'bseparator-' + index} className={styles.hour_separator_line}></div>
                                    ))}
                                </div>
                                <div className={styles.general_separator}></div>
                                {Array.from(Array(7).keys()).map((day, index) => (
                                    <div key={'day-' + index} className={styles.bday}
                                        onClick={(event) => {
                                            if (isEditable) {
                                                handleBoxClick(event, index);
                                            }
                                        }}>
                                        {availabilityBoxes.map((box) => {
                                            if (box.dayIndex === index) {
                                                return (
                                                    <div
                                                        key={'box-' + box.id + '-' + index}
                                                        id={'box-' + box.id + '-' + index}
                                                        className={`${styles.availability_box} ${styles.show}`}
                                                        style={{
                                                            top: calculateTimeToPixels(box.startHour) + 'px',
                                                            height: calculateDurationToPixels(box.duration) + 'px',
                                                        }}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleAvaliability(event, box);
                                                        }}
                                                    ></div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                ))}
                                <Popper
                                    referenceElement={referenceElement!}
                                    placement="right"
                                    strategy="fixed"
                                >
                                    {({ ref, style, placement, arrowProps }) => (
                                        <div ref={ref} style={style} data-placement={placement} className={showPopper ? `${styles.popper} ${styles.show}` : `${styles.popper} ${styles.hide}`}>
                                            <div ref={arrowProps.ref} style={arrowProps.style} />
                                            <div className={styles.popper_card}>
                                                <div className={styles.popper_card_header}>
                                                    <div className={styles.popper_card_header_title}>
                                                        <span>Restricción</span>
                                                    </div>
                                                    <div className={styles.popper_card_header_close}>
                                                        <button type='button' onClick={closePopper} className={styles.close_button}>
                                                            <FontAwesomeIcon icon={faTimes} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={styles.popper_card_body}>
                                                    <div className={styles.popper_card_body_content}>
                                                        Se podrá reservar el día <span>{selectedBox?.dayIndex || selectedBox?.dayIndex === 0 ? completeDays[selectedBox?.dayIndex] : 'Ninguno'}</span>
                                                    </div>
                                                    <Formik
                                                        initialValues={initialValues}
                                                        validationSchema={validationSchema}
                                                        onSubmit={saveChange}
                                                        validateOnChange={true}
                                                    >
                                                        {({ isSubmitting, errors, touched, setFieldValue, values, setSubmitting, resetForm }) => (
                                                            <>
                                                                <div>
                                                                    <span className={styles.preInput}>de</span>
                                                                    {isEditable ? (
                                                                        <>
                                                                            <Field
                                                                                type="number"
                                                                                id="startHour"
                                                                                name="startHour"
                                                                                className={errors.startHour && touched.startHour ? `${styles.popperInput} ${styles.error_input}` : `${styles.popperInput}`}
                                                                                value={inputAttributes?.startHour}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                    const newStartHour = parseInt(e.target.value);
                                                                                    handleStartHourChange(newStartHour, setFieldValue, values);
                                                                                }}
                                                                                disabled={isEditable ? false : true}
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className={styles.information_display}>{inputAttributes?.startHour < 10 ? '0' + inputAttributes?.startHour : inputAttributes?.startHour}</span>
                                                                        </>
                                                                    )}
                                                                    :
                                                                    {isEditable ? (
                                                                        <>
                                                                            <Field
                                                                                type="number"
                                                                                id="startMinute"
                                                                                name="startMinute"
                                                                                min={-1}
                                                                                max={60}
                                                                                className={errors.startMinute && touched.startMinute ? `${styles.popperInput} ${styles.error_input}` : `${styles.popperInput}`}
                                                                                value={inputAttributes?.startMinute}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                    const newStartMinute = parseInt(e.target.value);
                                                                                    handleStartMinuteChange(newStartMinute, setFieldValue, values);
                                                                                }}
                                                                                disabled={isEditable ? false : true}
                                                                            />
                                                                            <span className={styles.dissapearingText}> horas</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className={styles.information_display}>{inputAttributes?.startMinute < 10 ? '0' + inputAttributes?.startMinute : inputAttributes?.startMinute}</span> horas
                                                                        </>
                                                                    )}

                                                                </div>
                                                                <ErrorMessage name="startHour" component="div" className={styles.error} />
                                                                <ErrorMessage name="startMinute" component="div" className={styles.error} />

                                                                <div>
                                                                    <span className={styles.preInput}>a</span>
                                                                    {isEditable ? (
                                                                        <>
                                                                            <Field
                                                                                type="number"
                                                                                id="endHour"
                                                                                name="endHour"
                                                                                className={errors.endHour && touched.endHour ? `${styles.popperInput} ${styles.error_input}` : `${styles.popperInput}`}
                                                                                value={inputAttributes?.endHour}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                    const newEndHour = parseInt(e.target.value);
                                                                                    handleEndHourChange(newEndHour, setFieldValue, values);
                                                                                }}
                                                                                disabled={isEditable ? false : true}
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className={styles.information_display}>{inputAttributes?.endHour < 10 ? '0' + inputAttributes?.endHour : inputAttributes?.endHour}</span>
                                                                        </>
                                                                    )}
                                                                    :
                                                                    {isEditable ? (
                                                                        <>
                                                                            <Field
                                                                                type="number"
                                                                                id="endMinute"
                                                                                name="endMinute"
                                                                                min={-1}
                                                                                max={60}
                                                                                className={errors.endMinute && touched.endMinute ? `${styles.popperInput} ${styles.error_input}` : `${styles.popperInput}`}
                                                                                value={inputAttributes?.endMinute}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                    const newEndMinute = parseInt(e.target.value);
                                                                                    handleEndMinuteChange(newEndMinute, setFieldValue, values);
                                                                                }}
                                                                                disabled={isEditable ? false : true}
                                                                            />
                                                                            <span className={styles.dissapearingText}> horas</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className={styles.information_display}>{inputAttributes?.endMinute < 10 ? '0' + inputAttributes?.endMinute : inputAttributes?.endMinute}</span> horas
                                                                        </>
                                                                    )}

                                                                </div>
                                                                <ErrorMessage name="endHour" component="div" className={styles.error} />
                                                                <ErrorMessage name="endMinute" component="div" className={styles.error} />

                                                                <div>
                                                                    {isEditable ? (
                                                                        <>
                                                                            <span className={styles.preInput}>Duración: </span>
                                                                            <Field
                                                                                type="number"
                                                                                id="duration"
                                                                                name="duration"
                                                                                min={0}
                                                                                max={MAX_DURATION}
                                                                                className={errors.duration && touched.duration ? `${styles.popperInput} ${styles.error_input}` : `${styles.popperInput}`}
                                                                                value={inputAttributes?.duration}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                                    const newDuration = parseInt(e.target.value);
                                                                                    handleDurationChange(newDuration, setFieldValue, values);
                                                                                }}
                                                                                disabled={isEditable ? false : true}
                                                                            />
                                                                            <span className={styles.dissapearingText}> minutos</span>
                                                                        </>
                                                                    ) : ("")}

                                                                </div>
                                                                <ErrorMessage name="duration" component="div" className={styles.error} />
                                                                {isHourError && (
                                                                    <div className={styles.errorContainer}>
                                                                        <div className={styles.error_2}>Existe un conflicto con los horarios escogidos, por favor verifique e intente de nuevo</div>
                                                                    </div>
                                                                )}
                                                                {isEditable && (
                                                                    <>
                                                                        <button type="button" className={styles.save_button} disabled={Object.keys(errors).length > 0 ? true : false} onClick={() => saveChange(values, { setSubmitting, resetForm })}>Guardar</button>

                                                                        <button type="button" className={styles.delete_button} onClick={() => deleteBox()}>
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </Formik>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Popper>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schedule;