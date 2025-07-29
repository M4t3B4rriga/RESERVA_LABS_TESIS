import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import CardReservas from '@/src/components/CardReservas';
import List from '@/src/components/List';
import { CreateEspacioModal } from "@/src/components/CreateEspacios";
import InfiniteScroll from 'react-infinite-scroll-component';
import { ReservaInfo } from '@/libs/reserva';
import { Espacio } from '@/libs/espacios';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAmountDown, faSpinner, faPrint, faFileCsv, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Reservas.module.css';
import { API_BASE_URL, API_BASE_URL_SEC } from '@/src/components/BaseURL';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateCSV } from '@/src/components/csvGeneratorFuntions'
import { generatePDF } from '@/src/components/pdfGeneratorFuntions'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { set } from 'date-fns';
import { jwtVerify } from 'jose';
import Modal from '@mui/material/Modal';
import Link from 'next/link';
import Layout from '@/src/components/Layout';
import { Auth } from '@/libs/auth';
import Head from 'next/head';

const PAGE_SIZE = 4;
type OrderBy = 'CodReserva' | 'Dia' | 'NombreEspacio' | 'TipoEvento' | 'EstadoSolicitud' | 'EventoAcademico' | 'EsPersonaExterna' | 'FechaCreacion';
type OrderDir = 'ASC' | 'DESC';

type ConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    onReject: () => void;
    action: string;
    usuarioLogueado: Auth | null;
}

function ConfirmationModal(props: ConfirmationModalProps) {
    const { isOpen, onClose, onAccept, onReject, action, usuarioLogueado } = props;

    const handleAccept = () => {
        onAccept();
    };

    const handleReject = () => {
        onReject();
    };

    // Verificar si el usuario tiene permisos de administrador (CodRol 2 o 3)
    // CodRol 2: Administrador, CodRol 3: Admin Root
    const isAdmin = usuarioLogueado && (usuarioLogueado.CodRol === 2 || usuarioLogueado.CodRol === 3);

    return (
        <Modal open={isOpen} onClose={onClose} className={styles.modal}>
            <div className={styles.card_confirmation}>
                <h3>Confirmación</h3>
                {!isAdmin ? (
                    <div>
                        <div>No tienes permisos para gestionar solicitudes de reserva. Solo los administradores y Admin Root pueden aceptar o rechazar solicitudes.</div>
                        <div className={styles.card_buttons_container}>
                            <button onClick={onClose} className={styles.cancel_button}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {action === '1' && (
                            <>
                                <div>Está a punto de aceptar la solicitud para realizar la reserva. ¿Está seguro?</div>
                                <div className={styles.card_buttons_container}>
                                    <button onClick={onClose} className={styles.cancel_button}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleAccept} className={styles.confirm_button}>
                                        Aceptar
                                    </button>
                                </div>
                            </>
                        )}
                        {action === '0' && (
                            <>
                                <div>Está a punto de rechazar la solicitud para realizar la reserva. ¿Está seguro?</div>
                                <div className={styles.card_buttons_container}>
                                    <button onClick={onClose} className={styles.cancel_button}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleReject} className={styles.reject_button}>
                                        Rechazar
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { page = 1, limit = PAGE_SIZE, search = '', filter = 'Estado-1', orderBy = 'Dia', orderDir = 'ASC' } = context.query;

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
            return { props: { reservas: [], totalCount: 0, usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL_SEC}/api/reserva`, {
            params: { page, limit, search, filter, orderBy, orderDir },
        });
        const reservas = response.data.reservas;
        const totalCount = response.data.totalCount;

        return { props: { reservas, totalCount, usuarioLogueado: usuarioLogueado } };
    } catch (error) {
        console.error(error);
        return { props: { reservas: [], totalCount: 0, usuarioLogueado: null } };
    }
}

export default function Reservas({ reservas: initialReserva, totalCount: initialTotalCount, usuarioLogueado: InitialUsuario }: { reservas: ReservaInfo[], totalCount: number, usuarioLogueado: Auth | null }) {
    const [reservas, setReservas] = useState(initialReserva);
    const [totalReservas, setTotalReservas] = useState(initialTotalCount);
    const [lenghtReservas, setLenghtReservas] = useState(initialReserva.length);
    const [usuarioLogueado, setUsuarioLogueado] = useState(InitialUsuario);

    const [showModal, setShowModal] = useState(false);
    const [tempReserva, setTempReserva] = useState<ReservaInfo | null>(null);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [search, setSearch] = useState('');
    const [espaciosSearch, setEspaciosSearch] = useState<Espacio[]>();
    const [espaciosSearchTotal, setEspaciosSearchTotal] = useState(0);
    const [hasDataSearch, setHasDataSearch] = useState(false);

    const [filters, setFilters] = useState(['Estado-1']);
    const [filterTiposEspacio, setFilterTiposEspacio] = useState([]);
    const [filterUnidades, setFilterUnidades] = useState([]);
    const [selectedFilterTiposEspacio, setselectedFilterTiposEspacio] = useState<string[]>([]);
    const [selectedFilterUnidades, setselectedFilterUnidades] = useState<string[]>([]);
    const [selectedFilterEstadoSolicitud, setselectedFilterEstadoSolicitud] = useState<string[]>([]);
    const [selectedFilterEventoAcademico, setselectedFilterEventoAcademico] = useState<string[]>([]);
    const [selectedFilterEsPersonaExterna, setselectedFilterEsPersonaExterna] = useState<string[]>([]);
    const [selectedFilterEstado, setselectedFilterEstado] = useState<string[]>(['Estado-1']);
    const [selectedFilterReserva, setselectedFilterReserva] = useState<string[]>([]);
    const [selectedFilterPersonaInterna, setselectedFilterPersonaInterna] = useState<string[]>([]);
    const [selectedFilterPersonaExterna, setselectedFilterPersonaExterna] = useState<string[]>([]);
    const [selectedFilterDiasAnteriores, setselectedFilterDiasAnteriores] = useState<string[]>([]);

    const [selectedOrder, setSelectedOrder] = useState<OrderBy>('Dia');
    const [selectedOrderDir, setSelectedOrderDir] = useState<OrderDir>('DESC');
    const [orderBy, setOrderBy] = useState<OrderBy>('Dia');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSolicitud, setIsLoadingSolicitud] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const modalSearchRef = useRef<HTMLDivElement>(null);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const modalOrderRef = useRef<HTMLDivElement>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [hasMore, setHasMore] = useState(initialTotalCount < PAGE_SIZE ? false : true);
    const router = useRouter();
    const orderOptions = ['CodReserva', 'Dia', 'NombreEspacio', 'TipoEvento', 'EstadoSolicitud', 'EventoAcademico', 'EsPersonaExterna', 'FechaCreacion'];
    const orderLibrary: { [key: string]: string } = { 'CodReserva': 'Reserva', 'Dia': 'Dia Reservacion', 'NombreEspacio': 'Espacio', 'TipoEvento': 'Tipo de Evento', 'EstadoSolicitud': 'Solicitud', 'EventoAcademico': 'Evento Academico', 'EsPersonaExterna': 'Persona Externa', 'FechaCreacion': 'Fecha de Creacion' };
    const [isNestedModalOpen, setIsNestedModalOpen] = useState(false);
    const [selectedReserva, setSelectedReserva] = useState<ReservaInfo | null>(null);
    const [action, setAction] = useState('');
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [solicitud, setSolicitud] = useState('');
    const [messageSolicitud, setMessageSolicitud] = useState('');

    useEffect(() => {
        if (usuarioLogueado === null) {
            router.push('/login');
        }
    }, [usuarioLogueado]);

    useEffect(() => {
        const query = router.query;
        if (query.page) setCurrentPage(parseInt(query.page as string));
        if (query.limit) setLimit(parseInt(query.limit as string));
        if (query.search) setSearch(query.search as string);
        if (query.filter) {
            if (typeof query.filter === 'string') {
                const filterQuery = query.filter.split(',');
                setFilters(filterQuery);
                const filterEstadoSolicitud = filterQuery.map((filter) => filter.split('-')[0] === 'EstadoSolicitud' ? filter : '');
                const filterEventoAcademico = filterQuery.map((filter) => filter.split('-')[0] === 'EventoAcademico' ? filter : '');
                const filterEsPersonaExterna = filterQuery.map((filter) => filter.split('-')[0] === 'EsPersonaExterna' ? filter : '');
                const filterTiposEspacio = filterQuery.map((filter) => filter.split('-')[0] === 'CodTipoEspacio' ? filter : '');
                const filterUnidades = filterQuery.map((filter) => filter.split('-')[0] === 'CodUnidad' ? filter : '');
                const filterReserva = filterQuery.map((filter) => filter.split('-')[0] === 'CodReserva' ? filter : '');
                const filterPersonaInterna = filterQuery.map((filter) => filter.split('-')[0] === 'Persona' ? filter : '');
                const filterPersonaExterna = filterQuery.map((filter) => filter.split('-')[0] === 'Externo' ? filter : '');
                const filterDiasAnteriores = filterQuery.map((filter) => filter.split('-')[0] === 'DiasAnteriores' ? filter : '');
                setselectedFilterEstadoSolicitud(filterEstadoSolicitud.filter(Boolean));
                setselectedFilterEventoAcademico(filterEventoAcademico.filter(Boolean));
                setselectedFilterEsPersonaExterna(filterEsPersonaExterna.filter(Boolean));
                setselectedFilterTiposEspacio(filterTiposEspacio.filter(Boolean));
                setselectedFilterUnidades(filterUnidades.filter(Boolean));
                setselectedFilterReserva(filterReserva.filter(Boolean));
                setselectedFilterPersonaInterna(filterPersonaInterna.filter(Boolean));
                setselectedFilterPersonaExterna(filterPersonaExterna.filter(Boolean));
                setselectedFilterDiasAnteriores(filterDiasAnteriores.filter(Boolean));
            } else {
                setFilters(query.filter);
            }
        }
        if (query.orderBy) {
            setOrderBy(query.orderBy as OrderBy);
            setSelectedOrder(query.orderBy as OrderBy);
        }
        if (query.orderDir) {
            setOrderDir(query.orderDir as OrderDir);
            setSelectedOrderDir(query.orderDir as OrderDir);
        }
    }, [router.query]);

    function handleSearchTermChange(newSearchTerm: string) {
        setIsSearchLoading(true);
        setSearch(newSearchTerm);
        setShowSearchModal(true);
        if (newSearchTerm !== '') {
            try {
                const fetchSearchData = async () => {
                    const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
                        params: { page: 1, limit: 5, search: newSearchTerm, filter: 'Estado-1', orderBy, orderDir },
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
            }
        } else {
            setHasDataSearch(false);
            setEspaciosSearch([]);
        }
        setIsSearchLoading(false);
    };

    const handleCardClick = (id: number) => {
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
            if (modalFilterRef.current && !modalFilterRef.current.contains(event.target as Node)) {
                setShowFilterModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalFilterRef]);

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
            if (modalOrderRef.current && !modalOrderRef.current.contains(event.target as Node)) {
                setShowOrderModal(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [modalOrderRef]);

    const handlePrint = () => {
        if (showPrintModal) {
            setShowPrintModal(false);
        } else {
            setShowPrintModal(true);
        }
    }

    const handleFilter = () => {
        setIsFilterLoading(true);
        if (showFilterModal) {
            setShowFilterModal(false);
        } else {
            setShowFilterModal(true);
            try {
                const fetchFilterData = async () => {
                    const response = await axios.get(`${API_BASE_URL}/api/espacios/filters`);
                    setFilterTiposEspacio(response.data.filters.nombres_tipos_espacios);
                    setFilterUnidades(response.data.filters.nombres_unidades);
                }
                fetchFilterData();
            } catch (error) {
                console.error(error);
            }
        }
        setIsFilterLoading(false);
    }

    const handleOrder = () => {
        if (showOrderModal) {
            setShowOrderModal(false);
        } else {
            setShowOrderModal(true);
        }
    }

    const fetchMoreData = async () => {
        setIsLoading(true);
        setCurrentPage((prevPage) => prevPage + 1);
        const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
            params: { page: page + 1, limit, search, filter: filters.join(','), orderBy, orderDir },
        });

        if (response.data.reservas.length === 0) {
            setHasMore(false);
        } else {
            setReservas((prevReservas) => [...prevReservas, ...response.data.reservas]);
            setLenghtReservas((prevLenghtReservas) => prevLenghtReservas + response.data.reservas.length);
        }
        console.log(reservas, totalReservas, page, hasMore, search, filters, orderBy, orderDir);
        setIsLoading(false);
    };

    const fetchData = async () => {
        setCurrentPage(1);
        const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
            params: { limit: PAGE_SIZE, search: search, filter: filters.join(','), orderBy: orderBy, orderDir: orderDir },
        });
        const newReservas = response.data.reservas;
        const newTotalCount = response.data.totalCount;
        setReservas(newReservas);
        setTotalReservas(newTotalCount);
        setLenghtReservas(newReservas.length);
        setHasMore(true);
    };

    const fetchDataFilters = async (newFilter: string[]) => {
        setCurrentPage(1);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
                params: {
                    page: 1,
                    limit: PAGE_SIZE,
                    search: search,
                    filter: newFilter.join(','),
                    orderBy: orderBy,
                    orderDir: orderDir
                },
            });
            const newReservas = response.data.reservas;
            const newTotalCount = response.data.totalCount;
            console.log(newReservas, newTotalCount);
            setReservas(newReservas);
            setTotalReservas(newTotalCount);
            setLenghtReservas(newReservas.length);
            if (newReservas.length === 0 || newReservas.length < PAGE_SIZE) setHasMore(false);
            else setHasMore(true);
        } catch (error) {
            console.error(error);
            Store.addNotification({
                title: "Ha ocurrido un error",
                message: "Lo sentimos ha ocurido un problema, vuelva a intentarlo mas tarde. ",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
            setReservas([]);
            setTotalReservas(0);
            setLenghtReservas(0);
            setHasMore(false);
        }

    };

    const fetchDataOrder = async (newOrderBy: string, newOrderDir: string) => {
        setCurrentPage(1);
        const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
            params: {
                limit: PAGE_SIZE,
                search: search,
                filter: filters.join(','),
                orderBy: newOrderBy,
                orderDir: newOrderDir
            },
        });
        const newReservas = response.data.reservas;
        setReservas(newReservas);
        if (newReservas.length === 0 || newReservas.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);
        setLenghtReservas(newReservas.length);
        console.log(reservas, newReservas, filters, search, newOrderBy, newOrderDir, page, hasMore, totalReservas);
    };

    const handleLoadSearchResults = async () => {
        setShowSearchModal(false);
        router.push({
            pathname: '/reservas',
            query: {
                search: search,
                filter: filters.join(','),
                orderBy: orderBy,
                orderDir: orderDir
            }
        });
        fetchData();
    };

    const handleFilterOptions = async () => {
        setShowFilterModal(false);
        const newFilter = selectedFilterEstadoSolicitud.concat(selectedFilterEventoAcademico, selectedFilterEsPersonaExterna, selectedFilterTiposEspacio, selectedFilterUnidades, selectedFilterReserva, selectedFilterPersonaInterna, selectedFilterPersonaExterna, selectedFilterDiasAnteriores);
        setFilters(newFilter);
        setReservas([]);
        setTotalReservas(0);
        setHasMore(true);
        router.push({
            pathname: '/reservas',
            query: {
                search: search,
                filter: newFilter.join(','),
                orderBy: orderBy,
                orderDir: orderDir
            }
        });
        fetchDataFilters(newFilter);
    };

    const handleOrderOptions = async () => {
        setShowOrderModal(false);
        const newOrderBy = selectedOrder;
        const newOrderDir = selectedOrderDir;
        setOrderBy(newOrderBy);
        setOrderDir(newOrderDir);
        setReservas([]);
        setTotalReservas(0);
        setHasMore(true);
        router.push({
            pathname: '/reservas',
            query: {
                search: search,
                filter: filters.join(','),
                orderBy: newOrderBy,
                orderDir: newOrderDir
            }
        });
        fetchDataOrder(newOrderBy, newOrderDir);
    };

    const handleDownloadCSV = async () => {
        setIsPrintLoading(true);
        try {
            // Obtener los registros que deseas exportar
            const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const reservas = response.data.reservas;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre', 'Descripción', 'Capacidad', 'Ubicación', 'Tipo', 'Unidad', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = reservas.map((r: Espacio, i: number) => {
                return {
                    '#': i + 1,
                    'Nombre': r.NombreEspacio,
                    'Descripción': r.DescripcionEspacio,
                    'Capacidad': r.CapacidadEspacio,
                    'Ubicación': r.DescripcionUbicacion,
                    'Tipo': r.NombreTipoEspacio,
                    'Unidad': r.NombreUnidad,
                    'Estado': r.Estado == "1" ? 'Activo' : 'Inactivo',
                }
            });

            // Exportar los datos como CSV
            generateCSV(headers, data, "Reporte de Reservas");
        } catch (error) {
            console.error(error);
        }
        setIsPrintLoading(false);
    };

    const handleDownloadPDF = async () => {
        setIsPrintLoading(true);
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/reserva`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const reservas = response.data.espacio.map((r: Espacio, index: number) => [index + 1, r.NombreEspacio, r.DescripcionEspacio, r.CapacidadEspacio, r.DescripcionUbicacion, r.NombreTipoEspacio, r.NombreUnidad, r.Estado]);
            const header = ['N°', 'Nombre', 'Descripción', 'Capacidad', 'Ubicación', 'Tipo', 'Unidad', 'Estado'];
            const reportTitle = "Reporte de Reservas";
            generatePDF(reservas, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
        setIsPrintLoading(false);
    };

    const handleEstadoSolicitudFilterChange = (filter: string) => {
        const [filterSplit, attribute] = filter.split('-');

        if (filterSplit === 'todos' && attribute !== undefined) {
            if (selectedFilterEstadoSolicitud.includes(`${attribute}-1`) && selectedFilterEstadoSolicitud.includes(`${attribute}-0`) && selectedFilterEstadoSolicitud.includes(`${attribute}-2`)) {
                setselectedFilterEstadoSolicitud([]);
                return;
            }
            setselectedFilterEstadoSolicitud([`${attribute}-2`, `${attribute}-1`, `${attribute}-0`]);
        } else if (selectedFilterEstadoSolicitud.includes(filter)) {
            setselectedFilterEstadoSolicitud(selectedFilterEstadoSolicitud.filter((f) => f !== filter));
        } else {
            setselectedFilterEstadoSolicitud([...selectedFilterEstadoSolicitud, filter]);
        }
    };

    const handleEventoAcademicoFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.checked;
        if (value === true) {
            setselectedFilterEventoAcademico(['EventoAcademico-1']);
        } else {
            setselectedFilterEventoAcademico([]);
        }
    };

    const handleEsPersonaExternaFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.checked;
        if (value === true) {
            setselectedFilterEsPersonaExterna(['EsPersonaExterna-1']);
        } else {
            setselectedFilterEsPersonaExterna([]);
        }
    };

    const handleDiasAnterioresFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.checked;
        if (value === true) {
            setselectedFilterDiasAnteriores(['DiasAnteriores-1']);
        } else {
            setselectedFilterDiasAnteriores([]);
        }
    };

    const handleEstadoFilterChange = (filter: string) => {
        const [filterSplit, attribute] = filter.split('-');

        if (filterSplit === 'todos' && attribute !== undefined) {
            if (selectedFilterEstado.includes(`${attribute}-1`) && selectedFilterEstado.includes(`${attribute}-0`)) {
                setselectedFilterEstado([]);
                return;
            }
            setselectedFilterEstado([`${attribute}-1`, `${attribute}-0`]);
        } else if (selectedFilterEstado.includes(filter)) {
            setselectedFilterEstado(selectedFilterEstado.filter((f) => f !== filter));
        } else {
            setselectedFilterEstado([...selectedFilterEstado, filter]);
        }
    };

    const handleTiposEspacioFilterChange = (filter: string) => {
        const [filterSplit, attribute] = filter.split('-');
        console.log(filter);
        if (filterSplit === 'todos' && attribute !== undefined) {
            if (selectedFilterTiposEspacio.length === filterTiposEspacio.length) {
                setselectedFilterTiposEspacio([]);
                return;
            }
            const allValues = filterTiposEspacio
                .map(tipo => `CodTipoEspacio-${tipo['codigo']}`);
            setselectedFilterTiposEspacio(allValues);
        } else if (selectedFilterTiposEspacio.includes(filter)) {
            setselectedFilterTiposEspacio(selectedFilterTiposEspacio.filter((f) => f !== filter));
        } else {
            setselectedFilterTiposEspacio([...selectedFilterTiposEspacio, filter]);
        }
    };

    const handleUnidadesFilterChange = (filter: string) => {
        const [filterSplit, attribute] = filter.split('-');

        if (filterSplit === 'todos' && attribute !== undefined) {
            if (selectedFilterUnidades.length === filterUnidades.length) {
                setselectedFilterUnidades([]);
                return;
            }
            const allValues = filterUnidades
                .map(unidad => `CodUnidad-${unidad['codigo']}`);
            setselectedFilterUnidades(allValues);
        } else if (selectedFilterUnidades.includes(filter)) {
            setselectedFilterUnidades(selectedFilterUnidades.filter((f) => f !== filter));
        } else {
            setselectedFilterUnidades([...selectedFilterUnidades, filter]);
        }
    };

    const closeConfirmationModal = () => {
        setIsNestedModalOpen(false);
        setSelectedReserva(null);
        setAction('');
    };

    const handleAccept = () => {
        setIsLoadingSolicitud(true);
        setIsNestedModalOpen(false);
        setTransactionModalOpen(true);
        sendSolicitud(selectedReserva as ReservaInfo, '1');
        setIsLoadingSolicitud(false);
    };

    const handleReject = () => {
        setIsLoadingSolicitud(true);
        setIsNestedModalOpen(false);
        setTransactionModalOpen(true);
        sendSolicitud(selectedReserva as ReservaInfo, '0');
        setIsLoadingSolicitud(false);
    };

    const handleFinish = () => {
        setTransactionModalOpen(false);
        setIsNestedModalOpen(false);
        setSelectedReserva(null);
        setAction('');
        setSolicitud('');
        setMessageSolicitud('');
        fetchData();
    };

    const sendSolicitud = async (reserva: ReservaInfo, action: string) => {
        setIsLoadingSolicitud(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/reserva/solicitud`, {
                reserva: reserva,
                action: action,
                usuarioLogueado: usuarioLogueado
            });
            if (response.status === 200) {
                if (action === '1') {
                    setSolicitud('Solicitud Aceptada');
                    setMessageSolicitud('La solicitud ha sido aceptada con éxito y los correos han sido enviados correctamente.');
                } else {
                    setSolicitud('Solicitud Rechazada');
                    setMessageSolicitud('La solicitud ha sido rechazada con éxito.');
                }
            } else {
                setSolicitud('Error');
                setMessageSolicitud('Lo sentimos, ha ocurrido un error al realizar la gestión de la solicitud. Por favor, inténtelo nuevamente');
                Store.addNotification({
                    title: "Ha ocurrido un error",
                    message: "Lo sentimos ha ocurido un problema, vuelva a intentarlo mas tarde. " + response.data.message,
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 2000,
                        onScreen: true,
                        pauseOnHover: true,
                    }
                });
            }
        } catch (e) {
            console.error(e);
            setSolicitud('Error');
            setMessageSolicitud('Lo sentimos, ha ocurrido un error al realizar la gestión de la solicitud. Por favor, inténtelo nuevamente' + e);
            Store.addNotification({
                title: "Ha ocurrido un error",
                message: "Lo sentimos ha ocurido un problema, vuelva a intentarlo mas tarde.",
                type: "danger",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 2000,
                    onScreen: true,
                    pauseOnHover: true,
                }
            });
        }
        setIsLoadingSolicitud(false);
    };

    const handleResetFilters = () => {
        setFilters([]);
        setReservas([]);
        setTotalReservas(0);
        setHasMore(true);
        router.push({
            pathname: '/reservas'
        });
        fetchDataFilters([]);
    };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Reservas</title>
            </Head>
            <div className={styles.espacios_container}>
                <ReactNotifications />
                <ConfirmationModal isOpen={isNestedModalOpen} onClose={closeConfirmationModal} onAccept={handleAccept} onReject={handleReject} action={action} usuarioLogueado={usuarioLogueado} />
                <Modal open={transactionModalOpen} className={styles.modal}>
                    <div className={styles.card_confirmation}>
                        {isLoadingSolicitud === true ? (<div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>) : (
                            <>
                                <h3>{solicitud}</h3>
                                <div>{messageSolicitud}</div>
                                <div className={styles.card_buttons_container}>
                                    <button onClick={handleFinish} className={styles.confirm_button}>
                                        Aceptar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>

                <div className={styles.mosaico_container}>
                    <div className={styles.espacios_header}>
                        <div onClick={handleResetFilters} className={styles.link}>
                            <h1>Reservas</h1>
                        </div>
                    </div>
                    <div className={styles.espacios_options}>
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
                        <div className={styles.print_filter_container}>
                            <div className={styles.print_container}>
                                <button onClick={handlePrint} className={styles.espacios_regular_button}>
                                    <FontAwesomeIcon icon={faPrint} />
                                    <span className={styles.espacios_regular_button_text}>Imprimir</span>
                                </button>
                                <div className={styles.print_modal} ref={modalPrintRef} style={{ display: showPrintModal ? 'flex' : 'none' }}>
                                    {!isPrintLoading ?
                                        <div>
                                            <button onClick={handleDownloadCSV}>
                                                <FontAwesomeIcon icon={faFileCsv} className={styles.csv_icon} />
                                                CSV</button>
                                            <button onClick={handleDownloadPDF}>
                                                <FontAwesomeIcon icon={faFilePdf} className={styles.pdf_icon} />
                                                PDF</button>
                                        </div>
                                        :
                                        <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>
                                    }

                                </div>
                            </div>
                            <div className={styles.print_container}>
                                <button onClick={handleOrder} className={styles.espacios_regular_button}>
                                    <FontAwesomeIcon icon={faSortAmountDown} style={{ marginRight: '5px' }} />
                                    <span className={styles.espacios_regular_button_text}>Ordenar</span>
                                </button>
                                <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)} className={styles.modal_2}>
                                    <div className={styles.order_modal}>
                                        <div className={styles.column}>
                                            <div className={styles.row}>
                                                <div className={styles.radio_container}>
                                                    <div className={styles.title_checkbox}>Ordenar por</div>
                                                    {orderOptions.map((option, index) => (
                                                        <label key={index} className={styles.radio_label}>
                                                            <input
                                                                type="radio"
                                                                name="OrderBy"
                                                                value={option}
                                                                checked={selectedOrder === option}
                                                                onChange={(e) => setSelectedOrder(e.target.value as OrderBy)}
                                                            />
                                                            <span className={styles.checkradio}></span>
                                                            {orderLibrary[option]}
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className={styles.radio_container}>
                                                    <div className={styles.title_checkbox}>Dirección</div>
                                                    <label className={styles.radio_label}>
                                                        <input
                                                            type="radio"
                                                            name="OrderDir"
                                                            value="ASC"
                                                            checked={selectedOrderDir === "ASC"}
                                                            onChange={(e) => setSelectedOrderDir(e.target.value as OrderDir)}
                                                        />
                                                        <span className={styles.checkradio}></span>
                                                        Ascendente
                                                    </label>
                                                    <label className={styles.radio_label}>
                                                        <input
                                                            type="radio"
                                                            name="OrderDir"
                                                            value="DESC"
                                                            checked={selectedOrderDir === "DESC"}
                                                            onChange={(e) => setSelectedOrderDir(e.target.value as OrderDir)}
                                                        />
                                                        <span className={styles.checkradio}></span>
                                                        Descendente
                                                    </label>
                                                </div>
                                            </div>
                                            <button onClick={handleOrderOptions} className={`${styles.espacios_normal_button} ${styles.align_center}`}>
                                                Ordenar
                                            </button>
                                        </div>
                                    </div>
                                </Modal>
                            </div>
                            <div className={styles.filter_container}>
                                <button onClick={handleFilter} className={styles.espacios_regular_button}>
                                    <FontAwesomeIcon icon={faFilter} style={{ marginRight: '5px' }} />
                                    <span className={styles.espacios_regular_button_text}>Filtrar</span>
                                </button>
                                <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} className={styles.modal_2}>
                                    <div className={styles.filter_modal}>
                                        {isFilterLoading === true ?
                                            (<div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div>) :
                                            (<div className={styles.column}>
                                                <div className={styles.row}>
                                                    <div className={styles.checkbox_container}>
                                                        <div className={styles.title_checkbox}>Estado Solicitud</div>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEstadoSolicitud.length === 3} onChange={() => handleEstadoSolicitudFilterChange('todos-EstadoSolicitud')} />
                                                            <span className={styles.checkmark}></span>
                                                            Todos
                                                        </label>
                                                        <hr />
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEstadoSolicitud.includes('EstadoSolicitud-1')} onChange={() => handleEstadoSolicitudFilterChange('EstadoSolicitud-1')} />
                                                            <span className={styles.checkmark}></span>
                                                            Reservadas
                                                        </label>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEstadoSolicitud.includes('EstadoSolicitud-2')} onChange={() => handleEstadoSolicitudFilterChange('EstadoSolicitud-2')} />
                                                            <span className={styles.checkmark}></span>
                                                            Pendientes
                                                        </label>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEstadoSolicitud.includes('EstadoSolicitud-0')} onChange={() => handleEstadoSolicitudFilterChange('EstadoSolicitud-0')} />
                                                            <span className={styles.checkmark}></span>
                                                            Rechazadas
                                                        </label>
                                                    </div>
                                                    <div className={styles.checkbox_container}>
                                                        <br />
                                                        <div className={styles.title_checkbox}>Reservas</div>
                                                        <hr />
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEventoAcademico.includes('EventoAcademico-1')} onChange={handleEventoAcademicoFilterChange} />
                                                            <span className={styles.checkmark}></span>
                                                            Evento Academico
                                                        </label>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterEsPersonaExterna.includes('EsPersonaExterna-1')} onChange={handleEsPersonaExternaFilterChange} />
                                                            <span className={styles.checkmark}></span>
                                                            Para Persona Externa
                                                        </label>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterDiasAnteriores.includes('DiasAnteriores-1')} onChange={handleDiasAnterioresFilterChange} />
                                                            <span className={styles.checkmark}></span>
                                                            Reservas anteriores al día actual
                                                        </label>
                                                    </div>
                                                    <div className={styles.checkbox_container}>
                                                        <div className={styles.title_checkbox}>Tipos de espacio</div>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterTiposEspacio.length === filterTiposEspacio.length} onChange={() => handleTiposEspacioFilterChange('todos-CodTipoEspacio')} />
                                                            <span className={styles.checkmark}></span>
                                                            Todos
                                                        </label>
                                                        <hr />
                                                        {filterTiposEspacio.map((tiposEspacio) => {
                                                            return (
                                                                <label key={tiposEspacio['codigo']} className={styles.checkbox_label}>
                                                                    <input type="checkbox" checked={selectedFilterTiposEspacio.includes(`CodTipoEspacio-${tiposEspacio['codigo']}`)} onChange={() => handleTiposEspacioFilterChange(`CodTipoEspacio-${tiposEspacio['codigo']}`)} />
                                                                    <span className={styles.checkmark}></span>
                                                                    {tiposEspacio['nombre']}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className={styles.checkbox_container}>
                                                        <div className={styles.title_checkbox}>Unidades</div>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterUnidades.length === filterUnidades.length} onChange={() => handleUnidadesFilterChange('todos-Unidades')} />
                                                            <span className={styles.checkmark}></span>
                                                            Todos
                                                        </label>
                                                        <hr />
                                                        {filterUnidades.map((unidad) => {
                                                            return (
                                                                <label key={unidad['codigo']} className={styles.checkbox_label}>
                                                                    <input type="checkbox" checked={selectedFilterUnidades.includes(`CodUnidad-${unidad['codigo']}`)} onChange={() => handleUnidadesFilterChange(`CodUnidad-${unidad['codigo']}`)} />
                                                                    <span className={styles.checkmark}></span>
                                                                    {unidad['nombre']}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <button onClick={handleFilterOptions} className={`${styles.espacios_normal_button} ${styles.align_center}`}>
                                                    Filtrar
                                                </button>
                                            </div>)
                                        }
                                    </div>
                                </Modal>
                            </div>
                        </div>
                    </div>
                    <InfiniteScroll
                        dataLength={lenghtReservas}
                        next={fetchMoreData}
                        hasMore={hasMore}
                        loader={isLoading ? <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div> : null}
                        endMessage={<div className={styles.end_info}>No hay más reservas para mostrar</div>}
                        style={{ overflowX: 'hidden' }}
                    >
                        <div className={styles.card_container}>
                            {reservas.map((reserva, index) => {
                                const imageUrl = reserva.NombreFoto ? reserva.RutaFoto + reserva.NombreFoto : '/images/descarga.jpg';

                                return (
                                    <CardReservas
                                        key={reserva.CodReserva + index}
                                        imageUrl={imageUrl}
                                        reserva={reserva}
                                        usuarioLogueado={usuarioLogueado}
                                        setSelectedReserva={setSelectedReserva}
                                        setIsNestedModalOpen={setIsNestedModalOpen}
                                        setAction={setAction}
                                    />
                                );
                            })}
                        </div>
                    </InfiniteScroll>
                </div>
            </div>
        </Layout>
    );
}