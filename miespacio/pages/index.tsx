import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSpinner, faPrint, faFileCsv, faFilePdf, faPlus, faFilter, faTrashAlt, faUndo, faTools, faBuilding, faUniversity, faMapMarkerAlt, faUser, faCheckCircle, faCalendar, faEllipsisV, faTrash, faUsers, faExclamationTriangle, faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Home.module.css'
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import SearchBar from '@/src/components/SearchBar';
import Calendar from '@/src/components/Calendar';
import { Espacio } from '@/libs/espacios';
import List from '@/src/components/List';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '@/src/components/BaseURL';
import axios from 'axios';
import Select from 'react-select';
import { Auth } from '@/libs/auth';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import Layout from '@/src/components/Layout';
import { Modal } from '@mui/material';

interface SelectsData {
  value: string | number;
  label: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {

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
      return { props: { usuarioLogueado: null } };
    }

    return { props: { usuarioLogueado: usuarioLogueado } };
  } catch (error) {
    console.error(error);
    return { props: { usuarioLogueado: null } };
  }
}

export default function Home({ usuarioLogueado: InitialUsuario }: { usuarioLogueado: Auth | null }) {
  const [search, setSearch] = useState('');
  const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(InitialUsuario);
  const currentDate = new Date();
  const currentDay = currentDate.getDay(); // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
  const difference = currentDay === 0 ? -6 : 1 - currentDay; // Calcular la diferencia de días para llegar al lunes
  const startOfCurrentWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + difference);
  const formattedCurrentDate = startOfCurrentWeek.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const startMonth = startOfCurrentWeek.toLocaleDateString('es-GB', { timeZone: 'America/Bogota', month: 'short' });
  const endMonth = new Date(startOfCurrentWeek.getFullYear(), startOfCurrentWeek.getMonth(), startOfCurrentWeek.getDate() + 6)
    .toLocaleDateString('es-GB', { timeZone: 'America/Bogota', month: 'short' });
  const startYear = startOfCurrentWeek.getFullYear();
  const weekLabel = `${startMonth} - ${endMonth} de ${startYear}`;
  const [week, setWeek] = useState(weekLabel);
  const [date, setDate] = useState(formattedCurrentDate);
  const [reservar, setReservar] = useState(false);
  const [espacio, setEspacio] = useState<number | null>(null);

  const [espaciosSearch, setEspaciosSearch] = useState<Espacio[]>();
  const [espaciosSearchTotal, setEspaciosSearchTotal] = useState(0);
  const [hasDataSearch, setHasDataSearch] = useState(false);
  const [filters, setFilters] = useState(['Reserva-Confirmadas']);
  const [isSSRCalled, setIsSSRCalled] = useState(true);
  const router = useRouter();
  const { id } = router.query;
  const formatOptions: SelectsData[] = [
    { value: 'd', label: 'Día' },
    { value: 's', label: 'Semana' },
  ];
  const [format, setFormat] = useState(formatOptions[1].value as string);

  const [isLoading, setIsLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const [filterTiposEspacio, setFilterTiposEspacio] = useState([]);
  const [filterUnidades, setFilterUnidades] = useState([]);
  const [selectedFilterTiposEspacio, setselectedFilterTiposEspacio] = useState<string[]>([]);
  const [selectedFilterUnidades, setselectedFilterUnidades] = useState<string[]>([]);
  const [selectedFilterParticipantes, setselectedFilterParticipantes] = useState<string[]>([]);
  const [selectedFilterReserva, setselectedFilterReserva] = useState<string[]>(['Reserva-Confirmadas']);

  const modalSearchRef = useRef<HTMLDivElement>(null);
  const modalPrintRef = useRef<HTMLDivElement>(null);
  const modalFilterRef = useRef<HTMLDivElement>(null);
  const modalOrderRef = useRef<HTMLDivElement>(null);
  const modalOptionsRef = useRef<HTMLDivElement>(null);
  //setDate(query.date as string);
  useEffect(() => {
    const query = router.query;
    if (query.format) {
      if (formatOptions.find((option) => option.value === query.format))
        setFormat(query.format as string);
    }
    if (query.date) {
      const inputDate = query.date as string;
      const regex = /^\d{2}-\d{2}-\d{4}$/;
      if (regex.test(inputDate)) {
        const currentDate = new Date(inputDate);
        if (!isNaN(currentDate.getTime())) {
          const currentDayOfWeek = currentDate.getDay();
          const startOfCurrentWeek = new Date(currentDate);
          const difference = currentDayOfWeek === 1 ? 0 : (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
          startOfCurrentWeek.setDate(currentDate.getDate() + difference);
          const endOfCurrentWeek = new Date(startOfCurrentWeek);
          endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
          const startMonth = startOfCurrentWeek.toLocaleString('es-GB', { timeZone: 'America/Bogota', month: 'short' });
          const endMonth = endOfCurrentWeek.toLocaleString('es-GB', { timeZone: 'America/Bogota', month: 'short' });
          setWeek(`${startMonth} - ${endMonth} de ${startOfCurrentWeek.getFullYear()}`);
          if (format === 'd' || query.format === 'd') setDate(inputDate);
          else setDate(startOfCurrentWeek.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));
        }
      }
    }
    if (query.reservar) {
      if (query.reservar === 'true') setReservar(true);
      else if (query.reservar === 'false') setReservar(false);
    }
    if (query.espacio) {
      if (query.espacio !== undefined && query.espacio !== null) setEspacio(parseInt(query.espacio as string));
      else setEspacio(null);
    } else setEspacio(null);
    if (query.search) setSearch(query.search as string);
    if (query.filter) {
      if (typeof query.filter === 'string') {
        const filterQuery = query.filter.split(',');
        setFilters(filterQuery);
        const filterTiposEspacio = filterQuery.map((filter) => filter.split('-')[0] === 'CodTipoEspacio' ? filter : '');
        const filterUnidades = filterQuery.map((filter) => filter.split('-')[0] === 'CodUnidad' ? filter : '');
        const filterParticipantes = filterQuery.map((filter) => filter.split('-')[0] === 'Participantes' ? filter : ''); //Participantes-Propio = mis reservas
        const filterReserva = filterQuery.map((filter) => filter.split('-')[0] === 'Reserva' ? filter : ''); //Reserva-Pendientes o Reserva-Confirmadas
        setselectedFilterTiposEspacio(filterTiposEspacio.filter(Boolean));
        setselectedFilterUnidades(filterUnidades.filter(Boolean));
        setselectedFilterParticipantes(filterParticipantes.filter(Boolean));
        setselectedFilterReserva(filterReserva.filter(Boolean));
      } else {
        setFilters(query.filter);
      }
    }
  }, [router.query]);

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

  const handlePrint = () => {
    if (showPrintModal) {
      setShowPrintModal(false);
    } else {
      setShowPrintModal(true);
    }
  };

  const handleLoadSearchResults = async () => {
    setShowSearchModal(false);
    router.push({
      pathname: '/espacios',
      query: {
        search: search,
        filter: filters.join(','),
        orderBy: 'ESP_NOMBRE',
        orderDir: 'ASC'
      }
    });
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

  const fetchDataFilters = async (newFilter: string[]) => {
    const response = await axios.get(`${API_BASE_URL}/api/reservas`, {
      params: {
        format: format,
        date: date,
        search: search,
        filter: newFilter.join(','),
        reservar: reservar,
        espacio: espacio,
      },
    });
    const newReserva = response.data.reservas;
    const newTotalCount = response.data.totalCount;
    //setReservas(newReserva);
  };

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

  const handleFilterOptions = async () => {
    setShowFilterModal(false);
    const newFilter = selectedFilterTiposEspacio.concat(selectedFilterUnidades, selectedFilterParticipantes, selectedFilterReserva);
    setFilters(newFilter);
    router.push({
      pathname: '/',
      query: {
        format: format,
        date: date,
        search: search,
        filter: newFilter.join(','),
        reservar: reservar,
        espacio: espacio,
      }
    });
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

  const handleReservasFilterChange = (filter: string) => {
    const [filterSplit, attribute] = filter.split('-');
    if (filterSplit === 'Participantes') {
      if (selectedFilterParticipantes.includes(filter)) {
        setselectedFilterParticipantes(selectedFilterParticipantes.filter((f) => f !== filter));
      } else {
        setselectedFilterParticipantes([...selectedFilterParticipantes, filter]);
      }
    } else if (filterSplit === 'Reserva') {
      if (selectedFilterReserva.includes(filter)) {
        setselectedFilterReserva(selectedFilterReserva.filter((f) => f !== filter));
      } else {
        setselectedFilterReserva([...selectedFilterReserva, filter]);
      }
    }
  };

  const handleFormatOptionChange = (selected: SelectsData | null) => {
    setFormat(selected?.value as string);
    const newFilter = selectedFilterTiposEspacio.concat(selectedFilterUnidades, selectedFilterParticipantes, selectedFilterReserva);
    setFilters(newFilter);

    const currentDate = new Date(date);
    const currentDayOfWeek = currentDate.getDay();
    const startOfCurrentWeek = new Date(currentDate);
    const difference = currentDayOfWeek === 1 ? 0 : (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
    startOfCurrentWeek.setDate(currentDate.getDate() + difference);
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
    const startMonth = startOfCurrentWeek.toLocaleString('es-GB', { timeZone: 'UTC', month: 'short' });
    const endMonth = endOfCurrentWeek.toLocaleString('es-GB', { timeZone: 'UTC', month: 'short' });
    if (selected?.value !== 'd') setDate(startOfCurrentWeek.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));

    router.push({
      pathname: '/',
      query: {
        format: selected?.value as string,
        date: selected?.value === 'd' ? date : startOfCurrentWeek.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
        search: search,
        filter: newFilter.join(','),
        reservar: reservar,
        espacio: espacio,
      }
    });
  };

  const handleDateChange = (direction: string) => {
    let days = 0;
    if (direction === 'f') {
      if (format === 's') {
        days = 7;
      } else if (format === 'd') {
        days = 1;
      }
    } else if (direction === 'b') {
      if (format === 's') {
        days = -7;
      } else if (format === 'd') {
        days = -1;
      }
    }

    const updatedDate = new Date(date);
    updatedDate.setDate(updatedDate.getDate() + days);
    setDate(updatedDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));

    router.push({
      pathname: '/',
      query: {
        format: format,
        date: updatedDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
        search: search,
        filter: filters.join(','),
        reservar: reservar,
        espacio: espacio,
      }
    });
  };

  const handleToday = () => {
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const difference = currentDay === 0 ? -6 : 1 - currentDay; // Calcular la diferencia de días para llegar al lunes
    const startOfCurrentWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + difference);
    const formattedCurrentDate = startOfCurrentWeek.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    if (format === 'd') setDate(currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'));
    else setDate(formattedCurrentDate);

    router.push({
      pathname: '/',
      query: {
        format: format,
        date: format === 'd' ? currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : formattedCurrentDate,
        search: search,
        filter: filters.join(','),
        reservar: reservar,
        espacio: espacio,
      }
    });
  };

  const sendDate = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate());
    return newDate;
  }

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Inicio</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </Head>
      <div className={styles.container}>
        <ReactNotifications />
        <div className={styles.body_container}>
          <header>
            <div className={styles.calendar_header}>
              <span>
                <h1>Calendario</h1>
              </span>
              <div className={styles.options_container}>
                <button type="button" onClick={handleToday} className={`${styles.normal_button} ${styles.display_in_big_only_b}`}>
                  Hoy
                </button>
                <div className={`${styles.calendar_options} ${styles.display_in_big_only}`}>
                  <button type="button" className={styles.calendar_button} onClick={() => handleDateChange('b')}>
                    {format === 's' ? (
                      <FontAwesomeIcon icon={faAngleDoubleLeft} />
                    ) : (
                      <FontAwesomeIcon icon={faAngleLeft} />
                    )}
                  </button>
                  <span className={styles.date_format}>{week}</span>
                  <button type="button" className={styles.calendar_button} onClick={() => handleDateChange('f')}>
                    {format === 's' ? (
                      <FontAwesomeIcon icon={faAngleDoubleRight} />
                    ) : (
                      <FontAwesomeIcon icon={faAngleRight} />
                    )}
                  </button>
                </div>
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
                      <button onClick={handleLoadSearchResults} className={`${styles.normal_button} ${styles.align_center}`}>
                        Más resultados
                      </button> : <div></div>
                    }
                  </div>
                </div>
                <div className={styles.secondary_container}>
                  <button type="button" onClick={handleToday} className={`${styles.normal_button} ${styles.display_in_small_only_b}`}>
                    Hoy
                  </button>
                  <Select
                    options={formatOptions}
                    value={formatOptions.find((option) => option.value === format)}
                    onChange={handleFormatOptionChange}
                    placeholder="Selecciona una opción"
                    classNamePrefix="react-select-format"
                    className={styles.select}
                  />
                  <div className={styles.filter_container}>
                    <button onClick={handleFilter} className={styles.regular_button}>
                      <FontAwesomeIcon icon={faFilter} />
                      <span className={styles.regular_button_text}>Filtrar</span>
                    </button>
                    <Modal open={showFilterModal} onClose={() => setShowFilterModal(false)} className={styles.modal}>
                      <div className={styles.filter_modal}>
                        {isFilterLoading ?
                          <div className={styles.load_icon}><FontAwesomeIcon icon={faSpinner} spin /></div> :
                          <div className={styles.column}>
                            <div className={styles.row}>
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

                              <div className={styles.checkbox_container}>
                                <div className={styles.title_checkbox}>Reservas</div>
                                <label className={styles.checkbox_label}>
                                </label>
                                <hr />
                                <label className={styles.checkbox_label}>
                                  <input type="checkbox" checked={selectedFilterParticipantes.includes(`Participantes-Propio`)} onChange={() => handleReservasFilterChange(`Participantes-Propio`)} />
                                  <span className={styles.checkmark}></span>
                                  Mis reservas
                                </label>
                                <label className={styles.checkbox_label}>
                                  <input type="checkbox" checked={selectedFilterReserva.includes(`Reserva-Pendientes`)} onChange={() => handleReservasFilterChange(`Reserva-Pendientes`)} />
                                  <span className={styles.checkmark}></span>
                                  Pendientes
                                </label>
                                <label className={styles.checkbox_label}>
                                  <input type="checkbox" checked={selectedFilterReserva.includes(`Reserva-Confirmadas`)} onChange={() => handleReservasFilterChange(`Reserva-Confirmadas`)} />
                                  <span className={styles.checkmark}></span>
                                  Confirmadas
                                </label>
                                <label className={styles.checkbox_label}>
                                  <input type="checkbox" checked={selectedFilterReserva.includes(`Reserva-Repasos`)} onChange={() => handleReservasFilterChange(`Reserva-Repasos`)} />
                                  <span className={styles.checkmark}></span>
                                  Repasos
                                </label>
                              </div>
                            </div>
                            <button type='button' onClick={handleFilterOptions} className={`${styles.normal_button} ${styles.align_center}`}>
                              Filtrar
                            </button>
                          </div>
                        }
                      </div>
                    </Modal>
                  </div>
                </div>
              </div>
              <div className={`${styles.calendar_options} ${styles.display_in_small_only}`}>
                <button type="button" className={styles.calendar_button} onClick={() => handleDateChange('b')}>
                  {format === 's' ? (
                    <FontAwesomeIcon icon={faAngleDoubleLeft} />
                  ) : (
                    <FontAwesomeIcon icon={faAngleLeft} />
                  )}
                </button>
                <span className={styles.date_format}>{week}</span>
                <button type="button" className={styles.calendar_button} onClick={() => handleDateChange('f')}>
                  {format === 's' ? (
                    <FontAwesomeIcon icon={faAngleDoubleRight} />
                  ) : (
                    <FontAwesomeIcon icon={faAngleRight} />
                  )}
                </button>
              </div>
              {/*aca poner los modales*/}
            </div>
          </header>
        </div>
        <div className={`${styles.line} ${styles.display_in_big_only}`}></div>
        <div className={styles.body}>
          <div className={styles.calendar_container}>
            <Calendar
              Espacio={espacio}
              isEditable={false}
              useRouteCodEspacio={false}
              format={format}
              date={sendDate()}
              filters={filters}
              reservar={reservar}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}
