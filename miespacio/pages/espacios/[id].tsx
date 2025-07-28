import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import List from '@/src/components/List';
import FotosCarousel from '@/src/components/FotosCarousel';
import { CreateEspacioModal } from "@/src/components/CreateEspacios";
import DeleteConfirmation from "@/src/components/DeleteConfirmation";
import { EditEspacioModal } from "@/src/components/EditEspacios";
import { Espacio, Espacio_ID, DirigenteEspacio_EspID } from '@/libs/espacios';
import { FotoEspacio } from '@/libs/fotoEspacio';
import { EquipoForEspacio } from '@/libs/equipo';
import { TipoEquipo } from '@/libs/tipoEquipo';
import { PersonaInterna } from '@/libs/persona';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import DisponibilitySchedule from "@/src/components/DisponibilitySchedule";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSpinner, faPrint, faFileCsv, faFilePdf, faPlus, faEdit, faTrashAlt, faUndo, faTools, faBuilding, faUniversity, faMapMarkerAlt, faUser, faCheckCircle, faCalendar, faEllipsisV, faTrash, faUsers, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Espacios.module.css';
import { API_BASE_URL } from '@/src/components/BaseURL';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateCSV } from '@/src/components/csvGeneratorFuntions'
import { generatePDF, generateEspacioPDF } from '@/src/components/pdfGeneratorFuntions'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { jwtVerify } from 'jose';
import { Auth } from '@/libs/auth';
import Layout from '@/src/components/Layout';
import Head from 'next/head';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { id } = context.query;

    try {
        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { reservas: [], totalCount: 0, usuarioLogueado: null } };
        }

        const { payload } = await jwtVerify(
            miEspacioSession,
            new TextEncoder().encode('secret')
        );

        console.log(payload);

        const CodPersonaInterna = payload?.PI;
        const NombreUsuario = payload?.Nombre + ' ' + payload?.ApellPaterno;
        const CodRol = payload?.CodRol;
        const CodUsuario = payload?.CodUsuario;

        const usuarioLogueado = {
            CodPersonaInterna: CodPersonaInterna as number,
            usuarioNombre: NombreUsuario as string,
            CodRol: CodRol as number,
            usuarioLogueado: CodUsuario as number,
        } as Auth;

        if (CodPersonaInterna === undefined || NombreUsuario === undefined || CodRol === undefined || CodUsuario === undefined) {
            console.log('No hay payload');
            return { props: { espacio: {}, fotosEspacio: [], dirigentesEspacio: [], error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/espacios/${id}`);
        if (response.status === 200) {
            const espacio = response.data.espacio[0];
            const fotosEspacio = response.data.fotos || [];
            const dirigentesEspacio = response.data.dirigentes || [];
            if (espacio.Estado == "0" && usuarioLogueado.CodRol != 2 && usuarioLogueado.CodRol != 3) {
                return { props: { espacio: {}, fotosEspacio: [], dirigentesEspacio: [], error: true, messageError: "El espacio que intenta acceder no existe", usuarioLogueado: usuarioLogueado } };
            }
            return { props: { espacio, fotosEspacio, dirigentesEspacio, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { espacio: {}, fotosEspacio: [], dirigentesEspacio: [], error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }
    } catch (error) {
        console.error(error);
        return { props: { espacio: {}, fotosEspacio: [], dirigentesEspacio: [], error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }

}

export default function Espacios({ espacio: initialEspacio, fotosEspacio: initialFotosEspacio, dirigentesEspacio: initialDirigenteEspacio, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { espacio: Espacio_ID, fotosEspacio: FotoEspacio[], dirigentesEspacio: DirigenteEspacio_EspID[], error: Boolean | null, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(initialUsuarioLogueado);
    const [espacio, setEspacio] = useState(initialEspacio);
    const [fotosEspacio, setFotosEspacio] = useState(initialFotosEspacio);
    const [dirigentesEspacio, setDirigentesEspacio] = useState(initialDirigenteEspacio);
    const [personasInternasDirigentes, setPersonasInternasDirigentes] = useState<PersonaInterna[]>(() => initialDirigenteEspacio.map((dirigente: DirigenteEspacio_EspID) => {
        return {
            CodPersonaInterna: dirigente.CodUsuario,
            CodUnidad: 0,
            Nombre: dirigente.NombreUsuario,
            ApellidoPaterno: dirigente.ApellidoPaternoUsuario,
            ApellidoMaterno: dirigente.ApellidoMaternoUsuario,
            CarnetID: dirigente.CarnetID,
            EmailInstitucional: "",
            EmailPersonal: "",
            Telefono: "",
            Cedula: "",
        } as PersonaInterna;
    }));
    const [equiposEspacio, setEquiposEspacio] = useState<EquipoForEspacio[] | null>(null);
    const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[] | null>(null);
    const [search, setSearch] = useState('');
    const [espaciosSearch, setEspaciosSearch] = useState<Espacio[]>();
    const [espaciosSearchTotal, setEspaciosSearchTotal] = useState(0);
    const [hasDataSearch, setHasDataSearch] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const modalSearchRef = useRef<HTMLDivElement>(null);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const modalOrderRef = useRef<HTMLDivElement>(null);
    const modalOptionsRef = useRef<HTMLDivElement>(null);
    const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const router = useRouter();
    const { id } = router.query;
    const [editMode, setEditMode] = useState(false);
    const [editedEspacio, setEditedEspacio] = useState<Espacio_ID>(initialEspacio);
    const [activeTab, setActiveTab] = useState(3);
    const [isSSRCalled, setIsSSRCalled] = useState(true);
    const [isCrearEspacioModalOpen, setIsCrearEspacioModalOpen] = useState(false);
    const [isEditarEspacioModalOpen, setIsEditarEspacioModalOpen] = useState(false);
    const [isLoadingEquipos, setIsLoadingEquipos] = useState(false);
    const [errorEquipos, setErrorEquipos] = useState(false);
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    const [CodEspacioRestriccion, setCodEspacioRestriccion] = useState<number | null>(id ? parseInt(id.toString()) : null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/espacios/${id}`);

                if (response.status === 200) {
                    const espacio = response.data.espacio[0];
                    const fotosEspacio = response.data.fotos || [];
                    const dirigentesEspacio = response.data.dirigentes || [];
                    if (espacio.Estado == "0" && usuarioLogueado?.CodRol != 2 && usuarioLogueado?.CodRol != 3) {
                        setError(true);
                        setMessageError("El espacio que intenta acceder no existe");
                        return;
                    }
                    setEspacio(espacio);
                    setFotosEspacio(fotosEspacio);
                    setDirigentesEspacio(dirigentesEspacio);
                    setPersonasInternasDirigentes(() => dirigentesEspacio.map((dirigente: DirigenteEspacio_EspID) => {
                        return {
                            CodPersonaInterna: dirigente.CodUsuario,
                            CodUnidad: 0,
                            Nombre: dirigente.NombreUsuario,
                            ApellidoPaterno: dirigente.ApellidoPaternoUsuario,
                            ApellidoMaterno: dirigente.ApellidoMaternoUsuario,
                            CarnetID: dirigente.CarnetID,
                            EmailInstitucional: "",
                            EmailPersonal: "",
                            Telefono: "",
                            Cedula: "",
                        } as PersonaInterna;
                    }));
                    setActiveTab(3);
                    setShowSearchModal(false);
                    setSearch('');
                } else {
                    console.error('La API no respondió con el estado 200 OK');
                    setError(true);
                    setMessageError(response.data.message);
                }
            } catch (error) {
                console.error(error);
                setError(true);
                setMessageError("Hubo un error al obtener la información");
                Store.addNotification({
                    title: "Ha ocurrido un problema al cargar la pagina",
                    message: "Estamos teniendo problemas para cargar la pagina, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        }
        if (!isSSRCalled) {
            fetchData();
            setCodEspacioRestriccion(id ? parseInt(id.toString()) : null);
            setIsSSRCalled(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === 2) {
            fetchDataEquipos();
        }
    }, [activeTab]);

    const fetchDataEquipos = async () => {
        setIsLoadingEquipos(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/equipo/espacio/${id}`);

            if (response.status === 200) {
                const equiposEspacioNuevo = response.data.equipos || [];
                const tiposEquipoNuevo = response.data.tipos_equipo || [];

                if (JSON.stringify(equiposEspacioNuevo) === JSON.stringify(equiposEspacio)) {
                    setIsLoadingEquipos(false);
                    return;
                }
                setEquiposEspacio(equiposEspacioNuevo);
                setTiposEquipo(tiposEquipoNuevo);
                setErrorEquipos(false);
            } else {
                setErrorEquipos(true);
                console.error('La API no respondió con el estado 200 OK. ' + error);
                Store.addNotification({
                    title: "Ha ocurrido un problema al cargar los equipos",
                    message: "Estamos teniendo problemas para cargar los equipos del espacio, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Ha ocurrido un problema al cargar los equipos",
                message: "Estamos teniendo problemas para cargar los equipos del espacio, por favor intente mas tarde.",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }
        setIsLoadingEquipos(false);
    }

    function handleSearchTermChange(newSearchTerm: string) {
        setIsSSRCalled(false);
        setIsSearchLoading(true);
        setSearch(newSearchTerm);
        setShowSearchModal(true);
        if (newSearchTerm !== '') {
            try {
                const fetchSearchData = async () => {
                    const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
                        params: { page: 1, limit: 5, search: newSearchTerm, filter: 'Estado-1', orderBy: 'ESP_NOMBRE', orderDir: 'ASC' },
                    });
                    setEspaciosSearchTotal(response.data.totalCount);
                    if (response.data.espacio.length === 0) {
                        setHasDataSearch(false);
                        setEspaciosSearch([]);
                    } else {
                        setHasDataSearch(true);
                        setEspaciosSearch(response.data.espacio);
                    }
                }
                fetchSearchData();
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema al cargar la búsqueda",
                    message: "Estamos teniendo problemas para cargar la búsqueda, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            setHasDataSearch(false);
            setEspaciosSearch([]);
        }
        setIsSearchLoading(false);
    };

    const handleCardClick = (id: number) => {
        setSelectedEspacio(id);
        setModalOpen(true);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalSearchRef.current && !modalSearchRef.current.contains(event.target as Node)) {
                setShowSearchModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalSearchRef]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalPrintRef.current && !modalPrintRef.current.contains(event.target as Node)) {
                setShowPrintModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalPrintRef]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalOptionsRef.current && !modalOptionsRef.current.contains(event.target as Node)) {
                setShowOptionsModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalOptionsRef]);

    const handlePrint = () => {
        if (showPrintModal) {
            setShowPrintModal(false);
        } else {
            setShowPrintModal(true);
        }
    };

    const handleOptions = () => {
        if (showOptionsModal) {
            setShowOptionsModal(false);
        } else {
            setShowOptionsModal(true);
        }
    };

    const handleLoadSearchResults = async () => {
        setShowSearchModal(false);
        router.push({
            pathname: '/espacios',
            query: {
                search: search,
                filter: '',
                orderBy: 'ESP_NOMBRE',
                orderDir: 'ASC'
            }
        });
    };

    const handleEditClick = () => {
        setShowOptionsModal(false);
        setEditedEspacio({ ...espacio }); // Hacer una copia del objeto
        //setEditMode(true);

        if (personasInternasDirigentes.length > 0) {
            setIsEditarEspacioModalOpen(true);
        }
    }

    const handleCancelClick = () => {
        setEditedEspacio({} as Espacio_ID);
        setEditMode(false);
    }

    const handleSaveClick = async () => {
        // Enviar los cambios al servidor y actualizar el objeto `espacio`
        // ...
        setEditedEspacio({} as Espacio_ID);
        setEditMode(false);
    }

    const handleTabClick = (tabIndex: number) => {
        setActiveTab(tabIndex);
    };

    const handleOpenCrearEspacioModal = () => {
        setIsCrearEspacioModalOpen(true);
    };

    const handleCloseCrearEspacioModal = () => {
        setIsCrearEspacioModalOpen(false);
    };

    const handleOpenEditarEspacioModal = () => {
        setIsEditarEspacioModalOpen(true);
    };

    const handleCloseEditarEspacioModal = () => {
        setIsEditarEspacioModalOpen(false);
    };

    const handleReload = () => {
        router.reload();
    };

    const handleReloadEquipos = () => {
        fetchDataEquipos();
    };

    const handleDeleteClick = async () => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/espacios/${espacio.CodEspacio}`);
            const updatedEspacio = response.data;
            if (response.status == 200) {
                setEspacio({ ...espacio, Estado: updatedEspacio.Estado, Disponibilidad: updatedEspacio.Disponibilidad });
                Store.addNotification({
                    title: "Estado del equipo modificado con éxito",
                    message: "El espacio " + response.data.NombreEspacio + " se ha modificado con éxito",
                    type: "success",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true
                    }
                });
                if (response.data.Estado == "0") {
                    router.push('/espacios');
                }
            } else {
                Store.addNotification({
                    title: "Ha ocurrido un problema al modificar el estado del estado",
                    message: "Lo sentimos ha ocurido un problema al editar el estado del espacio, vuelva a intentarlo mas tarde. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true,
                        pauseOnHover: true
                    }
                });
            }
        } catch (error) {
            Store.addNotification({
                title: "Ha ocurrido un problema al modificar el estado del estado",
                message: "Lo sentimos ha ocurido un problema al editar el estado del espacio, vuelva a intentarlo mas tarde",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const handleDownloadPDF = async () => {
        setIsPrintLoading(true);
        setShowPrintModal(false);
        
        try {
            console.log('Iniciando generación de PDF...');
            console.log('Datos del espacio:', espacio);
            
            // Asegurar que tenemos los datos de equipos si no los hemos cargado
            let equiposData = equiposEspacio || [];
            let tiposData = tiposEquipo || [];
            
            if (!equiposData.length || !tiposData.length) {
                console.log('Intentando cargar datos de equipos desde API...');
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/equipo/espacio/${id}`);
                    if (response.status === 200) {
                        equiposData = response.data.equipos || [];
                        tiposData = response.data.tipos_equipo || [];
                        console.log('Equipos cargados:', equiposData);
                        console.log('Tipos de equipo cargados:', tiposData);
                    }
                } catch (equiposError) {
                    console.warn('Error al cargar equipos, continuando sin equipos:', equiposError);
                    // Continuamos sin equipos en lugar de fallar
                    equiposData = [];
                    tiposData = [];
                }
            }

            // Verificar que tenemos datos mínimos del espacio
            if (!espacio || !espacio.NombreEspacio) {
                throw new Error('No hay datos suficientes del espacio para generar el PDF');
            }

            console.log('Generando PDF con generateEspacioPDF...');
            // Generar el PDF (incluso sin equipos)
            generateEspacioPDF(espacio, equiposData, tiposData, dirigentesEspacio);
            
            console.log('PDF generado exitosamente');
            Store.addNotification({
                title: "PDF generado exitosamente",
                message: equiposData.length === 0 ? 
                    "El archivo PDF del espacio se ha descargado correctamente (sin información de equipos)." :
                    "El archivo PDF del espacio se ha descargado correctamente.",
                type: "success",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3000,
                    onScreen: true
                }
            });
        } catch (error) {
            console.error('Error detallado al generar PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            Store.addNotification({
                title: "Error al generar PDF",
                message: `Ha ocurrido un problema al generar el archivo PDF: ${errorMessage}. Por favor, intente nuevamente.`,
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 6000,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        } finally {
            setIsPrintLoading(false);
        }
    };

    // Función simplificada de PDF que solo usa datos básicos del espacio
    const handleSimplePDF = () => {
        try {
            console.log('Generando PDF simple del espacio...');
            const doc = new jsPDF();

            // Encabezado
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            const title = "Universidad de las Fuerzas Armadas-ESPE";
            const titleWidth = doc.getTextWidth(title);
            const x = (doc.internal.pageSize.getWidth() - titleWidth) / 2;
            doc.text(title, x, 20);

            // Título del espacio
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            const espacioTitle = `Información del Espacio: ${espacio.NombreEspacio}`;
            const espacioTitleWidth = doc.getTextWidth(espacioTitle);
            const espacioTitleX = (doc.internal.pageSize.getWidth() - espacioTitleWidth) / 2;
            doc.text(espacioTitle, espacioTitleX, 35);

            let yPos = 60;

            // Información básica
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(`Tipo: ${espacio.NombreTipoEspacio || 'N/A'}`, 20, yPos);
            yPos += 10;
            doc.text(`Capacidad: ${espacio.CapacidadEspacio || 0} personas`, 20, yPos);
            yPos += 10;
            doc.text(`Estado: ${espacio.Estado === '1' ? 'Activo' : 'Inactivo'}`, 20, yPos);
            yPos += 10;
            doc.text(`Unidad: ${espacio.SiglasUnidad || 'N/A'}`, 20, yPos);
            yPos += 10;
            doc.text(`Ubicación: ${espacio.DescripcionUbicacion || 'N/A'}`, 20, yPos);
            yPos += 20;

            // Descripción
            if (espacio.DescripcionEspacio) {
                doc.setFont('helvetica', 'bold');
                doc.text('Descripción:', 20, yPos);
                yPos += 10;
                doc.setFont('helvetica', 'normal');
                const splitDescription = doc.splitTextToSize(espacio.DescripcionEspacio, 170);
                doc.text(splitDescription, 20, yPos);
            }

            // Pie de página
            doc.setFontSize(10);
            doc.text(`Generado el ${new Date().toLocaleDateString('es-EC')}`, 20, doc.internal.pageSize.getHeight() - 10);

            doc.save(`Espacio_${espacio.NombreEspacio?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Sin_nombre'}.pdf`);
            
            Store.addNotification({
                title: "PDF simple generado",
                message: "El PDF básico del espacio se ha generado correctamente.",
                type: "success",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3000,
                    onScreen: true
                }
            });
        } catch (error) {
            console.error('Error en PDF simple:', error);
            Store.addNotification({
                title: "Error en PDF simple",
                message: "Error al generar PDF simple",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 3000,
                    onScreen: true
                }
            });
        }
    };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Espacio - {espacio.NombreEspacio}</title>
            </Head>
            <div className={styles.espacios_container}>
                <ReactNotifications />
                <div className={styles.mosaico_container}>
                    <div className={styles.espacios_header}>
                        <span className={styles.espacios_regular_button_text}>
                            <Link href={`/espacios`} className={styles.link}>
                                <h1>Espacios</h1>
                            </Link>
                        </span>
                        <div className={styles.print_filter_container}>
                            <div className={styles.search_container}>
                                <SearchBar searchTerm={search} onSearchTermChange={handleSearchTermChange} />
                                <div className={styles.search_modal} ref={modalSearchRef} style={{ display: showSearchModal ? 'flex' : 'none' }} >
                                    {!hasDataSearch ?
                                        <div>No hay datos para mostrar</div> : <div></div>
                                    }
                                    {espaciosSearch?.map((espacio) => {
                                        const imageUrl = espacio.NombreFoto ? espacio.RutaFoto + espacio.NombreFoto : '/images/descarga.jpg';

                                        return (
                                            <List
                                                key={espacio.CodEspacio}
                                                imageUrl={imageUrl}
                                                nombreEspacio={espacio.NombreEspacio}
                                                nombreTipoEspacio={espacio.NombreTipoEspacio}
                                                disponibilidad={espacio.Disponibilidad}
                                                capacidad={espacio.CapacidadEspacio}
                                                id={espacio.CodEspacio}
                                            />
                                        );
                                    })}

                                    {espaciosSearchTotal > 5 ?
                                        <button onClick={handleLoadSearchResults} className={`${styles.espacios_normal_button} ${styles.align_center}`}>
                                            Más resultados
                                        </button> : <div></div>
                                    }
                                </div>
                            </div>
                            {(usuarioLogueado?.CodRol == 2 || usuarioLogueado?.CodRol == 3) && (
                                <>
                                    <button onClick={handleOpenCrearEspacioModal} className={styles.espacios_normal_button}>
                                        <FontAwesomeIcon icon={faPlus} />
                                        <span className={styles.espacios_regular_button_text}>Crear</span>
                                    </button>
                                    <CreateEspacioModal
                                        isOpen={isCrearEspacioModalOpen}
                                        onClose={handleCloseCrearEspacioModal}
                                    />
                                    <EditEspacioModal
                                        isOpen={isEditarEspacioModalOpen}
                                        onClose={handleCloseEditarEspacioModal}
                                        Espacio={espacio}
                                        DirigentesEspacio={personasInternasDirigentes}
                                        FotosEspacio={fotosEspacio}
                                    />
                                    <DeleteConfirmation isOpen={showDeleteConfirmation} onClose={() => setShowDeleteConfirmation(false)} onConfirm={handleDeleteClick} registerName={espacio.NombreEspacio} />
                                </>
                            )}
                            <div className={styles.print_container}>
                                <button onClick={handlePrint} className={styles.espacios_regular_button}>
                                    <FontAwesomeIcon icon={faPrint} />
                                    <span className={styles.espacios_regular_button_text}>Imprimir</span>
                                </button>
                                <div className={styles.print_modal} ref={modalPrintRef} style={{ display: showPrintModal ? 'flex' : 'none' }}>
                                    {!isPrintLoading ?
                                        <div>
                                            <button type='button' /* onClick={handleDownloadCSV} */>
                                                <FontAwesomeIcon icon={faFileCsv} className={styles.csv_icon} />
                                                CSV</button>
                                            <button type='button' onClick={handleDownloadPDF}>
                                                <FontAwesomeIcon icon={faFilePdf} className={styles.pdf_icon} />
                                                PDF</button>
                                        </div>
                                        :
                                        <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                    }

                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.espacios_body_ind}>
                        {error ? (
                            <div className={styles.espacios_notfound}>
                                <div className={styles.espacios_notfound_icon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                                <div className={styles.espacios_notfound_text}>{messageError}</div>
                                <button type='button' onClick={handleReload} className={styles.espacios_normal_button}>Volver a intentar</button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.espacios_lead_container}>
                                    <div className={styles.espacios_lead_item}>
                                        <div className={styles.espacios_body_head}>
                                            <div className={styles.title_espacio}>
                                                {editMode ? (
                                                    <input type="text" value={editedEspacio?.NombreEspacio} onChange={e => setEditedEspacio({ ...editedEspacio, NombreEspacio: e.target.value })} />
                                                ) : (
                                                    <>
                                                        <h3 className={`${espacio.Estado == '0' ? styles.red_color : ''}`}>{espacio.NombreEspacio}</h3>
                                                    </>

                                                )}
                                            </div>
                                            {(usuarioLogueado?.CodRol == 2 || usuarioLogueado?.CodRol == 3) && (
                                                <div className={styles.edit_delete_container}>
                                                    <div className={styles.print_container}>
                                                        <button onClick={handleOptions} className={styles.espacios_options_button}>
                                                            <FontAwesomeIcon icon={faEllipsisV} />
                                                        </button>
                                                        <div className={styles.options_modal} ref={modalOptionsRef} style={{ display: showOptionsModal ? 'flex' : 'none' }}>
                                                            {editMode ?
                                                                (<div>
                                                                    <button onClick={handleSaveClick}>Guardar</button>
                                                                    <button onClick={handleCancelClick}>Cancelar</button>
                                                                </div>)
                                                                :
                                                                (<div>
                                                                    <button onClick={handleEditClick}>
                                                                        <FontAwesomeIcon icon={faEdit} /> <span> Editar</span>
                                                                    </button>
                                                                    {espacio.Estado == '1' ?
                                                                        (<>
                                                                            <button onClick={() => setShowDeleteConfirmation(true)} className={styles.red_color}>
                                                                                <FontAwesomeIcon icon={faTrash} /> <span> Desactivar</span>
                                                                            </button>
                                                                        </>) :
                                                                        (<>
                                                                            <button onClick={handleDeleteClick} className={styles.green2_color}>
                                                                                <FontAwesomeIcon icon={faUndo} /> <span> Activar</span>
                                                                            </button>
                                                                        </>)
                                                                    }
                                                                </div>)
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {espacio.Estado == "0" ? (
                                            <div className={styles.estado_inactivo}>Espacio Desactivado</div>
                                        ) : ""}
                                        <div className={styles.head_description_espacio}>
                                            {editMode ? (
                                                <textarea value={editedEspacio?.DescripcionEspacio} onChange={e => setEditedEspacio({ ...editedEspacio, DescripcionEspacio: e.target.value })} />
                                            ) : (
                                                espacio.DescripcionEspacio
                                            )}
                                        </div>
                                        {espacio.Estado == "1" && (
                                            <div className={styles.book_espacio}>
                                                <button className={styles.reserva_button}>
                                                    <Link href={`/?reservar=true&espacio=${espacio.CodEspacio}`} className={styles.link}>
                                                        <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '5px' }} />
                                                        Quiero reservar este espacio!
                                                    </Link>
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                    <div className={styles.carousel_container}>
                                        <FotosCarousel fotosEspacio={fotosEspacio} />
                                    </div>
                                </div>
                                <div className={styles.tabview_container}>
                                    <div className={styles.tabview_tabs}>
                                        <div
                                            key={3}
                                            className={`${styles.tabview_tab} ${activeTab === 3 ? `${styles.active}` : ''}`}
                                            onClick={() => handleTabClick(3)}
                                        >
                                            Restricciones para reserva
                                        </div>
                                        <div
                                            key={4}
                                            className={`${styles.tabview_tab} ${activeTab === 4 ? `${styles.active}` : ''}`}
                                            onClick={() => handleTabClick(4)}
                                        >
                                            Información general
                                        </div>
                                        <div
                                            key={1}
                                            className={`${styles.tabview_tab} ${styles.display} ${activeTab === 1 ? `${styles.active}` : ''}`}
                                            onClick={() => handleTabClick(1)}
                                        >
                                            Descripción
                                        </div>
                                        <div
                                            key={2}
                                            className={`${styles.tabview_tab} ${activeTab === 2 ? `${styles.active}` : ''}`}
                                            onClick={() => handleTabClick(2)}
                                        >
                                            Equipos
                                        </div>
                                    </div>
                                    <div className={styles.tabview_content}>
                                        <div
                                            key={1}
                                            className={`${styles.tabview_tabcontent} ${activeTab === 1 ? `${styles.active}` : ''}`}
                                        >
                                            <div className={styles.description_espacio}>
                                                {editMode ? (
                                                    <textarea value={editedEspacio?.DescripcionEspacio} onChange={e => setEditedEspacio({ ...editedEspacio, DescripcionEspacio: e.target.value })} />
                                                ) : (
                                                    espacio.DescripcionEspacio
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            key={2}
                                            className={`${styles.tabview_tabcontent} ${activeTab === 2 ? `${styles.active}` : ''}`}
                                        >
                                            <div className={styles.equipos_container}>
                                                {tiposEquipo?.length === 0 && (
                                                    <div className={styles.espacios_notfound}>
                                                        <div className={styles.espacios_notfound_text}>No hay equipos registrados para este espacio</div>
                                                    </div>
                                                )}

                                                {tiposEquipo?.map((te) => {
                                                    return (
                                                        <div key={te.CodTipoEquipo}>
                                                            <div className={styles.tipo_equipo}>
                                                                <div><ul className={styles.tipo_equipo_titulo}><span>{te.NombreTipoEquipo}</span></ul></div>
                                                            </div>
                                                            <div className={styles.equipos_list}>
                                                                {equiposEspacio?.map((equipo) => equipo.CodTipoEquipo === te.CodTipoEquipo ? (
                                                                    <OverlayTrigger
                                                                        key={equipo.CodEquipo + 2}
                                                                        trigger={['hover', 'focus']}
                                                                        placement="auto"
                                                                        container={document.body}
                                                                        overlay={
                                                                            <Popover id="popover-basic">
                                                                                <Popover.Body className={styles.popover}>
                                                                                    <div className={styles.title_equipo_popover}>{equipo.NombreEquipo}</div>
                                                                                    <div>{equipo.Marca} {equipo.Modelo}</div>
                                                                                    <div>{equipo.EstaInstalado === '1' ? <span className={styles.soft_green_color}>Instalado</span> : <span className={styles.red_color}>No instalado</span>}</div>
                                                                                </Popover.Body>
                                                                            </Popover>
                                                                        }
                                                                    >
                                                                        <div className={styles.equipos_list_item} key={equipo.CodEquipo}> <span className={styles.equipos_list_amount} key={equipo.CodEquipo + 1}>(x{equipo.Cantidad})</span> {equipo.NombreEquipo}</div>
                                                                    </OverlayTrigger>
                                                                ) : '')}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {errorEquipos && (
                                                    <div className={styles.espacios_notfound}>
                                                        <div className={styles.espacios_notfound_icon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                                                        <div className={styles.espacios_notfound_text}>Error al obtener los equipos</div>
                                                        <button type='button' onClick={handleReloadEquipos} className={styles.espacios_normal_button}>Volver a intentar</button>
                                                    </div>
                                                )}

                                                {isLoadingEquipos && (
                                                    <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                                )}

                                                {editMode ? (
                                                    <div>
                                                        <div className={styles.tipo_equipo}>
                                                            <div className={styles.tipo_equipo_titulo}><span>Configuracion de Equipos</span></div>
                                                        </div>
                                                        <div className={styles.equipos_config}>
                                                            {/* <div className={styles.equipos_config_item}>
                                                            <button className={styles.espacios_normal_button}>
                                                                <FontAwesomeIcon icon={faPlus} style={{ marginRight: '5px' }} />
                                                                Agregar nuevo Equipo
                                                            </button>
                                                        </div> */}
                                                            <div className={styles.equipos_config_item}>
                                                                <Link href={`/equipo?CodEspacio=${id}`} target="_blank">
                                                                    <button className={styles.espacios_notregular_button}>
                                                                        <FontAwesomeIcon icon={faTools} style={{ marginRight: "5px" }} />
                                                                        Gestionar Equipos
                                                                    </button>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>) : ('')
                                                }
                                            </div>
                                        </div>
                                        <div
                                            key={3}
                                            className={`${styles.tabview_tabcontent} ${activeTab === 3 ? `${styles.active}` : ''}`}
                                        >
                                            {CodEspacioRestriccion ? (
                                                <DisponibilitySchedule Espacio={CodEspacioRestriccion} isEditable={false} useRouteCodEspacio={true} />
                                            ) : (
                                                <div className={styles.espacios_notfound}>
                                                    <div className={styles.espacios_notfound_icon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                                                    <div className={styles.espacios_notfound_text}>No se encontró el espacio</div>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            key={4}
                                            className={`${styles.tabview_tabcontent} ${activeTab === 4 ? `${styles.active}` : ''}`}
                                        >
                                            <div className={styles.general_info_container}>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faUsers} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Capacidad</div>
                                                        <div className={styles.general_info_content}>{espacio.CapacidadEspacio} personas</div>
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faBuilding} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Tipo de Espacio</div>
                                                        <div className={styles.general_info_bublecontent}>{espacio.NombreTipoEspacio}</div>
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faCheckCircle} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Estado</div>
                                                        {espacio.Disponibilidad === 1 ? (
                                                            <div className={`${styles.general_info_bublecontent} ${styles.available}`}>Activo</div>) :
                                                            (<div className={`${styles.general_info_bublecontent} ${styles.unavailable}`}>No activo</div>)
                                                        }
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faUniversity} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Unidad</div>
                                                        <OverlayTrigger
                                                            trigger={['hover', 'focus']}
                                                            placement="auto"
                                                            overlay={
                                                                <Popover id="popover-basic">
                                                                    <Popover.Body className={styles.popover}>{espacio.NombreUnidad}</Popover.Body>
                                                                </Popover>
                                                            }
                                                        >
                                                            <div className={styles.general_info_bublecontent}>
                                                                {espacio.SiglasUnidad}
                                                            </div>
                                                        </OverlayTrigger>
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faUser} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Responsable</div>
                                                        <div className={styles.general_info_content}>
                                                            {dirigentesEspacio?.map((dirigente) => {
                                                                return (
                                                                    <div key={dirigente.CodDirigente}>
                                                                        {dirigente.NombreUsuario} {dirigente.ApellidoPaternoUsuario} {dirigente.ApellidoMaternoUsuario}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faMapMarkerAlt} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_title}>Ubicación referencial</div>
                                                        <div className={styles.general_info_content}>{espacio.DescripcionUbicacion}</div>
                                                    </div>
                                                </div>
                                                <div className={styles.general_info_item}>
                                                    <div className={styles.general_info_icon}><FontAwesomeIcon icon={faCalendar} /></div>
                                                    <div className={styles.column}>
                                                        <div className={styles.general_info_content}><span className={styles.general_info_title}>Fecha de creación</span> {espacio.FechaCreacion ? new Date(espacio.FechaCreacion).toLocaleDateString() : ''}</div>
                                                        <div className={styles.general_info_content}><span className={styles.general_info_title}>Fecha de edición</span> {espacio.FechaEdicion ? new Date(espacio.FechaEdicion).toLocaleDateString() : ''}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </Layout>
    );
}