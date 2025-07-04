import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next';
import axios from 'axios';
import Card from '@/src/components/Card';
import List from '@/src/components/List';
import { CreateEspacioModal } from "@/src/components/CreateEspacios";
import InfiniteScroll from 'react-infinite-scroll-component';
import { Espacio } from '@/libs/espacios';
import Pagination from '@/src/components/Pagination';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortAmountDown, faSpinner, faPrint, faFileCsv, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Espacios.module.css';
import { API_BASE_URL } from '@/src/components/BaseURL';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateCSV } from '@/src/components/csvGeneratorFuntions'
import { generatePDF } from '@/src/components/pdfGeneratorFuntions'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import Layout from '@/src/components/Layout';
import Head from 'next/head';
import { Modal } from '@mui/material';

const PAGE_SIZE = 12;
type OrderBy = 'NombreEspacio' | 'DescripcionEspacio' | 'Estado' | 'CapacidadEspacio' | 'Disponibilidad' | 'NombreTipoEspacio' | 'NombreUnidad' | 'NombreUsuario' | 'FechaCreacion' | 'FechaEdicion' | 'Estado_TipoEspacio' | 'Estado_Unidad' | 'Estado_Usuario';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const { page = 1, limit = PAGE_SIZE, search = '', filter = 'Estado-1', orderBy = 'NombreEspacio', orderDir = 'ASC' } = context.query;

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
            return { props: { espacios: [], totalCount: 0, usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
            params: { page, limit, search, filter, orderBy, orderDir },
        });
        const espacios = response.data.espacio;
        const totalCount = response.data.totalCount;
        return { props: { espacios, totalCount, usuarioLogueado: usuarioLogueado } };
    } catch (error) {
        console.error(error);
        return { props: { espacios: [], totalCount: 0, usuarioLogueado: null } };
    }
}

export default function Espacios({ espacios: initialEspacio, totalCount: initialTotalCount, usuarioLogueado: initialUsuarioLogueado }: { espacios: Espacio[], totalCount: number, usuarioLogueado: Auth | null }) {
    const [usuarioLogueado, setUsuarioLogueado] = useState(initialUsuarioLogueado);
    const [espacios, setEspacios] = useState(initialEspacio);
    const [totalEspacios, setTotalEspacios] = useState(initialTotalCount);
    const [lenghtEspacios, setLenghtEspacios] = useState(initialEspacio.length);
    const [NombreEspacio, setNombre] = useState('');
    const [DescripcionEspacio, setDescripcion] = useState('');
    const [CapacidadEspacio, setCapacidad] = useState(0);
    const [Disponibilidad, setDisponibilidad] = useState(0);
    const [CodTipoEspacio, setCodTipoEspacio] = useState(0);
    const [CodUnidad, setCodUnidad] = useState(0);
    const [CodUsuario, setCodUsuario] = useState(0);
    const [DescripcionUbicacion, setDescripcionUbicacion] = useState('');
    const [Estado, setEstado] = useState('');
    const [FechaCreacion, setFechaCreacion] = useState('');
    const [FechaEdicion, setFechaEdicion] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showModalEdit, setShowModalEdit] = useState(false);
    const [tempEspacio, setTempEspacio] = useState<Espacio | null>(null);
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
    const [selectedFilterDisponiblidad, setselectedFilterDisponiblidad] = useState<string[]>([]);
    const [selectedFilterEstado, setselectedFilterEstado] = useState<string[]>(['Estado-1']);
    const [selectedOrder, setSelectedOrder] = useState<OrderBy>('NombreEspacio');
    const [selectedOrderDir, setSelectedOrderDir] = useState<OrderDir>('DESC');
    const [orderBy, setOrderBy] = useState<OrderBy>('NombreEspacio');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
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
    const [selectedEspacio, setSelectedEspacio] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [isCrearEspacioModalOpen, setIsCrearEspacioModalOpen] = useState(false);
    const [hasMore, setHasMore] = useState(initialTotalCount < PAGE_SIZE ? false : true);
    const router = useRouter();
    const orderOptions = ['NombreEspacio', 'CapacidadEspacio', 'Disponibilidad', 'NombreTipoEspacio', 'NombreUnidad', 'Estado'];
    const orderLibrary: { [key: string]: string } = { 'NombreEspacio': 'Nombre', 'Estado': 'Estado', 'CapacidadEspacio': 'Capacidad', 'Disponibilidad': 'Disponibilidad', 'NombreTipoEspacio': 'Tipo de Espacio', 'NombreUnidad': 'Unidad' };

    useEffect(() => {
        const query = router.query;
        if (query.page) setCurrentPage(parseInt(query.page as string));
        if (query.limit) setLimit(parseInt(query.limit as string));
        if (query.search) setSearch(query.search as string);
        if (query.filter) {
            if (typeof query.filter === 'string') {
                const filterQuery = query.filter.split(',');
                setFilters(filterQuery);
                const filterDisponiblidad = filterQuery.map((filter) => filter.split('-')[0] === 'Disponibilidad' ? filter : '');
                const filterEstado = filterQuery.map((filter) => filter.split('-')[0] === 'Estado' ? filter : '');
                const filterTiposEspacio = filterQuery.map((filter) => filter.split('-')[0] === 'CodTipoEspacio' ? filter : '');
                const filterUnidades = filterQuery.map((filter) => filter.split('-')[0] === 'CodUnidad' ? filter : '');
                setselectedFilterDisponiblidad(filterDisponiblidad.filter(Boolean));
                setselectedFilterEstado(filterEstado.filter(Boolean));
                setselectedFilterTiposEspacio(filterTiposEspacio.filter(Boolean));
                setselectedFilterUnidades(filterUnidades.filter(Boolean));
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
        const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
            params: { page: page + 1, limit, search, filter: filters.join(','), orderBy, orderDir },
        });

        if (response.data.espacio.length === 0) {
            setHasMore(false);
        } else {
            setEspacios((prevEspacios) => [...prevEspacios, ...response.data.espacio]);
            setLenghtEspacios((prevLenghtEspacios) => prevLenghtEspacios + response.data.espacio.length);
        }
        console.log(espacios, totalEspacios, page, hasMore, search, filters, orderBy, orderDir);
        setIsLoading(false);
    };

    const fetchData = async () => {
        setCurrentPage(1);
        const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
            params: { limit: PAGE_SIZE, search: search, filter: filters.join(','), orderBy: orderBy, orderDir: orderDir },
        });
        const newEspacios = response.data.espacio;
        const newTotalCount = response.data.totalCount;
        setEspacios(newEspacios);
        setTotalEspacios(newTotalCount);
        setLenghtEspacios(newEspacios.length);
        setHasMore(true);
    };

    const fetchDataFilters = async (newFilter: string[]) => {
        setCurrentPage(1);
        const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
            params: {
                limit: PAGE_SIZE,
                search: search,
                filter: newFilter.join(','),
                orderBy: orderBy,
                orderDir: orderDir
            },
        });
        const newEspacios = response.data.espacio;
        const newTotalCount = response.data.totalCount;
        setEspacios(newEspacios);
        setTotalEspacios(newTotalCount);
        setLenghtEspacios(newEspacios.length);
        if (newEspacios.length === 0 || newEspacios.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);
    };

    const fetchDataOrder = async (newOrderBy: string, newOrderDir: string) => {
        setCurrentPage(1);
        const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
            params: {
                limit: PAGE_SIZE,
                search: search,
                filter: filters.join(','),
                orderBy: newOrderBy,
                orderDir: newOrderDir
            },
        });
        const newEspacios = response.data.espacio;
        setEspacios(newEspacios);
        if (newEspacios.length === 0 || newEspacios.length < PAGE_SIZE) setHasMore(false);
        else setHasMore(true);
        setLenghtEspacios(newEspacios.length);
        console.log(espacios, newEspacios, filters, search, newOrderBy, newOrderDir, page, hasMore, totalEspacios);
    };

    const handleLoadSearchResults = async () => {
        setShowSearchModal(false);
        router.push({
            pathname: '/espacios',
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
        const newFilter = selectedFilterDisponiblidad.concat(selectedFilterEstado, selectedFilterTiposEspacio, selectedFilterUnidades);
        setFilters(newFilter);
        setEspacios([]);
        setLenghtEspacios(0);
        setTotalEspacios(0);
        setHasMore(true);
        router.push({
            pathname: '/espacios',
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
        setEspacios([]);
        setLenghtEspacios(0);
        setTotalEspacios(0);
        setHasMore(true);
        router.push({
            pathname: '/espacios',
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
            const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const espacios = response.data.espacio;

            // Definir los nombres de las columnas
            const headers = ['#', 'Nombre', 'Descripción', 'Capacidad', 'Ubicación', 'Tipo', 'Unidad', 'Estado'];

            // Mapear los datos para que tengan la estructura adecuada
            const data = espacios.map((r: Espacio, i: number) => {
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
            generateCSV(headers, data, "Reporte de Espacios");
        } catch (error) {
            console.error(error);
        }
        setIsPrintLoading(false);
    };

    const handleDownloadPDF = async () => {
        setIsPrintLoading(true);
        try {
            // Obtener todos los registros sin paginación
            const response = await axios.get(`${API_BASE_URL}/api/espacios`, {
                params: { page: 1, limit: 99999, search, filter: filters.join(','), orderBy, orderDir },
            });
            const espacios = response.data.espacio.map((r: Espacio, index: number) => [index + 1, r.NombreEspacio, r.DescripcionEspacio, r.CapacidadEspacio, r.DescripcionUbicacion, r.NombreTipoEspacio, r.NombreUnidad, r.Estado]);
            const header = ['N°', 'Nombre', 'Descripción', 'Capacidad', 'Ubicación', 'Tipo', 'Unidad', 'Estado'];
            const reportTitle = "Reporte de Espacios";
            generatePDF(espacios, header, reportTitle);
        } catch (error) {
            console.error(error);
        }
        setIsPrintLoading(false);
    };

    const handleDisponibilidadFilterChange = (filter: string) => {
        const [filterSplit, attribute] = filter.split('-');

        if (filterSplit === 'todos' && attribute !== undefined) {
            if (selectedFilterDisponiblidad.includes(`${attribute}-1`) && selectedFilterDisponiblidad.includes(`${attribute}-0`)) {
                setselectedFilterDisponiblidad([]);
                return;
            }
            setselectedFilterDisponiblidad([`${attribute}-1`, `${attribute}-0`]);
        } else if (selectedFilterDisponiblidad.includes(filter)) {
            setselectedFilterDisponiblidad(selectedFilterDisponiblidad.filter((f) => f !== filter));
        } else {
            setselectedFilterDisponiblidad([...selectedFilterDisponiblidad, filter]);
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

    const handleOpenCrearEspacioModal = () => {
        setIsCrearEspacioModalOpen(true);
    };

    const handleCloseCrearEspacioModal = () => {
        setIsCrearEspacioModalOpen(false);
    };

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Espacio</title>
            </Head>
            <div className={styles.espacios_container}>
                <div className={styles.mosaico_container}>
                    <div className={styles.espacios_header}>
                        <h1>Espacios</h1>
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
                        {(usuarioLogueado?.CodRol === 2 || usuarioLogueado?.CodRol === 3) && (
                            <>
                                <button onClick={handleOpenCrearEspacioModal} className={styles.espacios_normal_button}>
                                    <FontAwesomeIcon icon={faPlus} />
                                    <span className={styles.espacios_regular_button_text}>Crear</span>
                                </button>

                                <CreateEspacioModal
                                    isOpen={isCrearEspacioModalOpen}
                                    onClose={handleCloseCrearEspacioModal}
                                />
                            </>
                        )}
                        <div className={styles.print_filter_container}>
                            <div className={styles.print_container}>
                                <button onClick={handlePrint} className={styles.espacios_regular_button}>
                                    <FontAwesomeIcon icon={faPrint} />
                                    <span className={styles.espacios_regular_button_text}>Imprimir</span>
                                </button>
                                <div className={styles.print_modal} ref={modalPrintRef} style={{ display: showPrintModal ? 'flex' : 'none' }}>
                                    {!isPrintLoading ?
                                        <div>
                                            <button /* onClick={handleDownloadCSV} */>
                                                <FontAwesomeIcon icon={faFileCsv} className={styles.csv_icon} />
                                                CSV</button>
                                            <button /* onClick={handleDownloadPDF} */>
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
                                <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)} className={styles.modal}>
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
                                <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} className={styles.modal}>
                                    <div className={styles.filter_modal}>
                                        {isFilterLoading ?
                                            <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div> :
                                            <div className={styles.column}>
                                                <div className={styles.row}>
                                                    <div className={styles.checkbox_container}>
                                                        <div className={styles.title_checkbox}>Disponibilidad</div>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterDisponiblidad.length === 2} onChange={() => handleDisponibilidadFilterChange('todos-Disponibilidad')} />
                                                            <span className={styles.checkmark}></span>
                                                            Todos
                                                        </label>
                                                        <hr />
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterDisponiblidad.includes('Disponibilidad-1')} onChange={() => handleDisponibilidadFilterChange('Disponibilidad-1')} />
                                                            <span className={styles.checkmark}></span>
                                                            Activos
                                                        </label>
                                                        <label className={styles.checkbox_label}>
                                                            <input type="checkbox" checked={selectedFilterDisponiblidad.includes('Disponibilidad-0')} onChange={() => handleDisponibilidadFilterChange('Disponibilidad-0')} />
                                                            <span className={styles.checkmark}></span>
                                                            Inactivos
                                                        </label>
                                                    </div>
                                                    {usuarioLogueado?.CodRol === 2 || usuarioLogueado?.CodRol === 3 && (
                                                        <div className={styles.checkbox_container}>
                                                            <div className={styles.title_checkbox}>Estado</div>
                                                            <label className={styles.checkbox_label}>
                                                                <input type="checkbox" checked={selectedFilterEstado.length === 2} onChange={() => handleEstadoFilterChange('todos-Estado')} />
                                                                <span className={styles.checkmark}></span>
                                                                Todos
                                                            </label>
                                                            <hr />
                                                            <label className={styles.checkbox_label}>
                                                                <input type="checkbox" checked={selectedFilterEstado.includes('Estado-1')} onChange={() => handleEstadoFilterChange('Estado-1')} />
                                                                <span className={styles.checkmark}></span>
                                                                Activos
                                                            </label>
                                                            <label className={styles.checkbox_label}>
                                                                <input type="checkbox" checked={selectedFilterEstado.includes('Estado-0')} onChange={() => handleEstadoFilterChange('Estado-0')} />
                                                                <span className={styles.checkmark}></span>
                                                                Inactivos
                                                            </label>
                                                        </div>
                                                    )}

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
                                            </div>
                                        }
                                    </div>
                                </Modal>
                            </div>
                        </div>
                    </div>
                    <InfiniteScroll
                        dataLength={lenghtEspacios}
                        next={fetchMoreData}
                        hasMore={hasMore}
                        loader={isLoading ? <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div> : null}
                        endMessage={<div className={styles.end_info}>No hay más espacios para mostrar</div>}
                        style={{ overflowX: 'hidden' }}
                    >
                        <div className={styles.card_container}>
                            {espacios.map((espacio) => {
                                const imageUrl = espacio.NombreFoto ? espacio.RutaFoto + espacio.NombreFoto : '/images/descarga.jpg';

                                return (
                                    <Card
                                        key={espacio.CodEspacio}
                                        imageUrl={imageUrl}
                                        nombreEspacio={espacio.NombreEspacio}
                                        nombreTipoEspacio={espacio.NombreTipoEspacio}
                                        disponibilidad={espacio.Disponibilidad}
                                        capacidad={espacio.CapacidadEspacio}
                                        id={espacio.CodEspacio}
                                        estado={espacio.Estado}
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