import { useState, useEffect } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Breadcrumbs, Typography, Modal } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import { Roles } from '@/libs/roles';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import { Permiso } from '@/libs/permiso';
import { Button } from '@mui/material';
import { useRouter } from 'next/router';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from '@/styles/CRUD.module.css';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import Select from 'react-select';
import { Funcionalidad } from '@/libs/funcionalidad';
import { ReactNotifications } from 'react-notifications-component'
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css'
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Head from 'next/head';
import Layout from '@/src/components/Layout';
import { param } from 'jquery';

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

const Permisos = ({ usuarioLogueado: InitialUsuario }: { usuarioLogueado: Auth | null }) => {
  const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(InitialUsuario);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([]);
  const [subSubMenuItems, setSubSubMenuItems] = useState<SubSubMenuItem[]>([]);
  const [roles, setRoles] = useState<Roles[]>([]); // Estado para almacenar la lista de roles
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null); // Estado para almacenar el ID del rol seleccionado
  const [selectedItems, setSelectedItems] = useState<number[]>([]); // Estado para almacenar los items seleccionados
  const [selectedSubItems, setSelectedSubItems] = useState<number[]>([]); // Estado para almacenar los subitems seleccionados
  const [selectedSubSubItems, setSelectedSubSubItems] = useState<number[]>([]); // Estado para almacenar los subsubitems seleccionados
  const [permissions, setPermissions] = useState<Permiso[]>([]);
  //edit
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [isModalOpenSubSubItem, setModalOpenSubSubItem] = useState(false);
  const [selectedSubMenu, setSelectedSubMenu] = useState<SubMenuItem | null>(null);
  const [selectedSubSubMenu, setSelectedSubSubMenu] = useState<SubSubMenuItem | null>(null);
  const [isModalOpenItemEdit, setModalOpenItemEdit] = useState(false);
  const [isModalOpenSubItemEdit, setModalOpenSubItemEdit] = useState(false);
  const [isModalOpenSubSubItemEdit, setModalOpenSubSubItemEdit] = useState(false);
  //edit
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidad[]>([]);
  const [funcionalidadesPorPerfil, setFuncionalidadesPorPerfil] = useState<Funcionalidad[]>([]);
  const router = useRouter();
  const [error, setError] = useState(true);
  const [messageError, setMessageError] = useState('');
  //mouse
  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    const fetchFuncionalidades = async () => {
      console.log('Aca hizo una llamada al servidor desde el cliente');


      try {
        const response = await axios.get(`${API_BASE_URL}/api/funcionalidad`);
        if (response.status === 200) {
          console.log(response.data.funcionalidades);
          setFuncionalidades(response.data.funcionalidades);

        } else {
          console.error('La API no respondió con el estado 200 OK');
          setError(true);
          setMessageError(response.data.message);
        }
      } catch (error) {
        console.error(error);
        setError(true);
        setMessageError("Hubo un error al obtener la información");
      }
    };
    fetchFuncionalidades();
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchData = async () => {
        console.log('Haciendo una llamada al servidor desde el cliente');
        const response = await axios.get(`${API_BASE_URL}/api/item`);
        console.log(response);
        setMenuItems(response.data.menuItems);
        setSubMenuItems(response.data.subMenuItems);
        setSubSubMenuItems(response.data.subSubMenuItems);
      };
      fetchData();
    }

    // Obtener la lista de roles desde el servidor o cualquier otra fuente de datos
    const fetchRoles = async () => {
      const response = await axios.get(`${API_BASE_URL}/api/roles`, {
        params: { filter: 'Estado-1' },
      });
      setRoles(response.data.roles);
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    // Obtener los permisos del rol seleccionado
    const fetchPermissions = async () => {
      if (selectedRoleId) {
        const response = await axios.get(`${API_BASE_URL}/api/permisos/${selectedRoleId}`);
        const permissions = response.data.permisos;
        setPermissions(permissions); // Actualizar el estado de los permisos
        const selectedItems = permissions.filter((permission: any) => permission.PK_TMS_ITEM_MENU !== null).map((permission: any) => permission.PK_TMS_ITEM_MENU);
        const selectedSubItems = permissions.filter((permission: any) => permission.PK_TMSSUBITEM_MENU !== null).map((permission: any) => permission.PK_TMSSUBITEM_MENU);
        const selectedSubSubItems = permissions.filter((permission: any) => permission.PK_TMSSUB_SUBITEM_MENU !== null).map((permission: any) => permission.PK_TMSSUB_SUBITEM_MENU);
        setSelectedItems(selectedItems);
        setSelectedSubItems(selectedSubItems);
        setSelectedSubSubItems(selectedSubSubItems);
      }
    };
    fetchPermissions();
  }, [selectedRoleId]);

  //Ediciones
  const openModalItemEdit = async (menuItem: MenuItem) => {
    try {

      console.log("hola" + selectedRoleId + menuItem.PK_TMS_ITEM_MENU)
      const response = await axios.get(`${API_BASE_URL}/api/funcionalidad?` + `ItemType=` + 'Item' + `&RolId=` + selectedRoleId + `&CodItem=` + menuItem.PK_TMS_ITEM_MENU);
      if (response.status === 200) {
        const funcionalidadesPerfil = response.data.funcionalidades;
        // Realiza las operaciones necesarias con los datos obtenidos
        console.log(funcionalidades);

        setFuncionalidadesPorPerfil(funcionalidadesPerfil);
        console.log(funcionalidadesPorPerfil);
      } else {
        console.error('La API no respondió con el estado 200 OK');
        setError(true);
        setMessageError(response.data.message);
      }
    } catch (error) {
      console.error(error);
      setError(true);
      setMessageError("Hubo un error al obtener la información");
    }
    console.log(funcionalidadesPorPerfil);
    setModalOpenItemEdit(true);
    setSelectedMenu(menuItem); // Almacena el item seleccionado
  };
  const closeModalItemEdit = () => {
    setFuncionalidadesPorPerfil([]);
    setModalOpenItemEdit(false);
  };

  const openModalSubItemEdit = async (menuSubItem: SubMenuItem) => {
    try {
      console.log("hola1" + selectedRoleId + menuSubItem.PK_TMSSUBITEM_MENU)
      const response = await axios.get(`${API_BASE_URL}/api/funcionalidad?` + `ItemType=` + 'subitem' + `&RolId=` + selectedRoleId + `&CodItem=` + menuSubItem.PK_TMSSUBITEM_MENU);
      if (response.status === 200) {
        const funcionalidadesPerfil = response.data.funcionalidades;
        // Realiza las operaciones necesarias con los datos obtenidos
        console.log(funcionalidades);

        setFuncionalidadesPorPerfil(funcionalidadesPerfil);
        console.log(funcionalidadesPorPerfil);
      } else {
        console.error('La API no respondió con el estado 200 OK');
        setError(true);
        setMessageError(response.data.message);
      }
    } catch (error) {
      console.error(error);
      setError(true);
      setMessageError("Hubo un error al obtener la información");
    }
    console.log(funcionalidadesPorPerfil);
    setModalOpenSubItemEdit(true);
    setSelectedSubMenu(menuSubItem); // Almacena el subitem seleccionado
  };
  const closeModalSubItemEdit = () => {
    setModalOpenSubItemEdit(false);
  };

  const openModalSubSubItemEdit = async (subSubMenuItem: SubSubMenuItem) => {
    try {
      console.log("hola2" + selectedRoleId + subSubMenuItem.PK_TMSSUB_SUBITEM_MENU)
      const response = await axios.get(`${API_BASE_URL}/api/funcionalidad?` + `ItemType=` + 'subsubitem' + `&RolId=` + selectedRoleId + `&CodItem=` + subSubMenuItem.PK_TMSSUB_SUBITEM_MENU);
      if (response.status === 200) {
        const funcionalidadesPerfil = response.data.funcionalidades;
        // Realiza las operaciones necesarias con los datos obtenidos
        console.log(funcionalidades);

        setFuncionalidadesPorPerfil(funcionalidadesPerfil);
        console.log(funcionalidadesPorPerfil);
      } else {
        console.error('La API no respondió con el estado 200 OK');
        setError(true);
        setMessageError(response.data.message);
      }
    } catch (error) {
      console.error(error);
      setError(true);
      setMessageError("Hubo un error al obtener la información");
    }
    console.log(funcionalidadesPorPerfil);
    setModalOpenSubSubItemEdit(true);
    setSelectedSubSubMenu(subSubMenuItem); // Almacena el subsubitem seleccionado
  };
  const closeModalSubSubItemEdit = () => {
    setModalOpenSubSubItemEdit(false);
  };

  const addFuntionsItems = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    console.log("si me llamaron");
    setSubmitting(true);


    try {
      const response = await axios.put(`${API_BASE_URL}/api/permisos`, {
        itemType: 'item',
        CodigoItem: values.CodigoItem,
        RolId: selectedRoleId,
        CodFuncionalidades: values.CodFuncionalidad,
      });
      setModalOpenItemEdit(false);
      resetForm();
    } catch (error) {

      console.error(error);
    }

    setSubmitting(false);
  };
  const addFuntionsSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    console.log("si me llamaron");
    setSubmitting(true);


    try {
      const response = await axios.put(`${API_BASE_URL}/api/permisos`, {
        itemType: 'subitem',
        CodigoSubItem: values.CodigoSubItem,
        RolId: selectedRoleId,
        CodFuncionalidades: values.CodFuncionalidad,
      });
      setModalOpenSubItemEdit(false);
      resetForm();
    } catch (error) {

      console.error(error);
    }

    setSubmitting(false);
  };
  const addFuntionsSubSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    console.log("si me llamaron");
    setSubmitting(true);


    try {
      const response = await axios.put(`${API_BASE_URL}/api/permisos`, {
        itemType: 'subsubitem',
        CodigoSubSubItem: values.CodigoSubSubItem,
        RolId: selectedRoleId,
        CodFuncionalidades: values.CodFuncionalidad,
      });
      setModalOpenSubSubItemEdit(false);
      resetForm();
    } catch (error) {

      console.error(error);
    }

    setSubmitting(false);
  };

  //Ediciones

  //
  const handleConfirmPermissions = async () => {
    if (selectedRoleId) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/permisos`, {
          roleId: selectedRoleId,
          selectedItems,
          selectedSubItems,
          selectedSubSubItems,
        });
        Store.addNotification({
          title: "Permisos guardados con éxito",
          message: "Permisos guardados con éxito",
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

        // Manejar la respuesta de la API según tus requerimientos
        console.log(response.data);
      } catch (error) {
        Store.addNotification({
          title: "Ha ocurrido un problema al guardar los permisos",
          message: "Ha ocurrido un problema al guardar los permisos, vuelva a intentarlo mas tarde",
          type: "danger",
          insert: "top",
          container: "top-left",
          animationIn: ["animate__animated", "animate__fadeIn"],
          animationOut: ["animate__animated", "animate__fadeOut"],
          dismiss: {
            duration: 2000,
            onScreen: true
          }
        });
        // Manejar el error de la API según tus requerimientos
        console.error(error);
      }
    }
  };

  //

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRoleId = event.target.value;
    setSelectedRoleId(selectedRoleId);
    setSelectedItems([]); // Limpiar la selección al cambiar de rol
    setSelectedSubItems([]); // Limpiar la selección al cambiar de rol
    setSelectedSubSubItems([]); // Limpiar la selección al cambiar de rol
  };

  //


  const handleItemCheck = (itemId: any) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((item) => item !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleSubItemCheck = (subItemId: any) => {
    if (selectedSubItems.includes(subItemId)) {
      setSelectedSubItems(selectedSubItems.filter((subItem) => subItem !== subItemId));
    } else {
      setSelectedSubItems([...selectedSubItems, subItemId]);
    }
  };

  const handleSubSubItemCheck = (subSubItemId: any) => {
    if (selectedSubSubItems.includes(subSubItemId)) {
      setSelectedSubSubItems(selectedSubSubItems.filter((subSubItem) => subSubItem !== subSubItemId));
    } else {
      setSelectedSubSubItems([...selectedSubSubItems, subSubItemId]);
    }
  };


  const emptyOption = { value: '', label: 'Selecciona la funcionalidad asociada' };
  const handleReload = () => {
    router.reload();
  };
  //

  const renderSubSubItems = (subMenuItem: SubMenuItem) => {
    return subSubMenuItems
      .filter((subSubMenuItem) => subSubMenuItem.PK_TMSSUBITEM_MENU === subMenuItem.PK_TMSSUBITEM_MENU)
      .map((subSubMenuItem) => (
        <li key={subSubMenuItem.PK_TMSSUB_SUBITEM_MENU}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link href={subSubMenuItem.SSM_URL} passHref>
                <Typography component="a" color="inherit">
                  {subSubMenuItem.SSM_NOMBRE}
                </Typography>
              </Link>
            </Breadcrumbs>
            {/* Agrega el checkbox para el subsubitem */}
            <input
              type="checkbox"
              checked={selectedSubSubItems.includes(subSubMenuItem.PK_TMSSUB_SUBITEM_MENU)} // Lógica para marcar el checkbox según el permiso y el rol seleccionado
              disabled={!selectedRoleId} // Deshabilitar el checkbox si no se ha seleccionado un rol
              onChange={() => handleSubSubItemCheck(subSubMenuItem.PK_TMSSUB_SUBITEM_MENU)}
            />
            {selectedRoleId && selectedSubSubItems.includes(subSubMenuItem.PK_TMSSUB_SUBITEM_MENU) && (
              <FontAwesomeIcon icon={faPlus} onClick={() => openModalSubSubItemEdit(subSubMenuItem)} />
            )}

          </div>
        </li>
      ));
  };

  const renderSubMenuItems = (menuItem: MenuItem) => {
    return subMenuItems
      .filter((subMenuItem) => subMenuItem.PK_TMS_ITEM_MENU === menuItem.PK_TMS_ITEM_MENU)
      .map((subMenuItem) => (
        <li key={subMenuItem.PK_TMSSUBITEM_MENU}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{subMenuItem.SME_NOMBRE}</Typography>
              {/* Agrega el checkbox para el subsubitem */}
              <input
                type="checkbox"
                checked={selectedSubItems.includes(subMenuItem.PK_TMSSUBITEM_MENU)} // Lógica para marcar el checkbox según el permiso y el rol seleccionado
                disabled={!selectedRoleId} // Deshabilitar el checkbox si no se ha seleccionado un rol
                onChange={() => handleSubItemCheck(subMenuItem.PK_TMSSUBITEM_MENU)}
              />
              <div style={{ marginRight: 'auto' }}>
                {selectedRoleId && selectedSubItems.includes(subMenuItem.PK_TMSSUBITEM_MENU) && (
                  <FontAwesomeIcon icon={faPlus} onClick={() => openModalSubItemEdit(subMenuItem)} />
                )}

              </div>
            </AccordionSummary>
            <AccordionDetails>
              <ul>{renderSubSubItems(subMenuItem)}</ul>
            </AccordionDetails>
          </Accordion>
        </li>
      ));
  };

  const renderItems = () => {
    return menuItems.map((menuItem) => (
      <li key={menuItem.PK_TMS_ITEM_MENU} >
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginRight: '10px', gap: '5px' }}>
              <input
                type="checkbox"
                checked={selectedItems.includes(menuItem.PK_TMS_ITEM_MENU)} // Lógica para marcar el checkbox según el permiso y el rol seleccionado
                disabled={!selectedRoleId} // Deshabilitar el checkbox si no se ha seleccionado un rol
                onChange={() => handleItemCheck(menuItem.PK_TMS_ITEM_MENU)}
              />
              <Typography>{menuItem.IME_NOMBRE}</Typography>
              <div style={{ marginLeft: 'auto' }}>
                {selectedRoleId && selectedItems.includes(menuItem.PK_TMS_ITEM_MENU) && (
                  <FontAwesomeIcon icon={faPlus} onClick={() => openModalItemEdit(menuItem)} />
                )}
              </div>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ul>{renderSubMenuItems(menuItem)}</ul>
          </AccordionDetails>
        </Accordion>
      </li>
    ));
  };

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Permisos</title>
      </Head>
      <h1>Permisos</h1>
      <div className={styles.crud_container}>
        <ReactNotifications />
        <div>
          <select onChange={handleRoleChange}>
            <option value="">Selecciona un rol</option>
            {roles.map((role) => (
              <option key={role.CodRol} value={role.CodRol}>
                {role.NombreRol}
              </option>
            ))}
          </select>
        </div>
        <nav className={styles.items_container}>
          <ul className={styles.navItems}>{renderItems()}</ul>
        </nav>
        <button type="button" onClick={handleConfirmPermissions} className={styles.crud_normal_button}>
          <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Confirmar permisos
        </button>
      </div>
      <Modal open={isModalOpenItemEdit} onClose={closeModalItemEdit}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Funcionalidades</h3>
            {selectedMenu && (
              <Formik
                initialValues={{
                  CodigoItem: selectedMenu.PK_TMS_ITEM_MENU,
                  NombreItem: selectedMenu.IME_NOMBRE,
                  URLItem: selectedMenu.IME_URL,
                  IconoItem: selectedMenu.IME_ICONO,
                  CodFuncionalidad: funcionalidadesPorPerfil.map((funcionalidadPorPerfil) => funcionalidadPorPerfil.PK_TMSFUNCIONALIDAD),
                }}

                onSubmit={addFuntionsItems} // Función para actualizar el item
                validateOnChange={true}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                  <form onSubmit={handleSubmit}>
                    <div>

                      <input
                        type="text"
                        id="CodigoItem"
                        name="CodigoItem"
                        value={values.CodigoItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        hidden
                      />
                      {touched.CodigoItem && errors.CodigoItem && <div>{errors.CodigoItem}</div>}
                    </div>

                    <label htmlFor="Funcionalidad">Funcionalidad</label>
                    <Field name="CodFuncionalidad">
                      {({ field, form }: { field: any, form: any }) => {


                        const options = [emptyOption, ...funcionalidades.map((funcionalidad: Funcionalidad) => ({ value: funcionalidad.PK_TMSFUNCIONALIDAD, label: funcionalidad.FUN_NOMBRE }))];

                        const handleChange = (selectedOptions: any) => {
                          if (selectedOptions) {
                            form.setFieldValue(
                              field.name,
                              selectedOptions.map((option: any) => option.value)
                            );
                          }
                        };

                        const selectedValues = field.value ? [...field.value] : [];
                        console.log(selectedValues);
                        return (
                          <Select
                            {...field}
                            value={options.filter((option: any) => selectedValues.includes(option.value))}
                            options={options}
                            onChange={handleChange}
                            classNamePrefix="react-select"
                            placeholder="Selecciona la funcionalidad asociada"
                            className={`${styles.create_select}`}
                            isSearchable
                            isMulti
                          />
                        );
                      }}
                    </Field>
                    <ErrorMessage name="CodUnidad" component="div" className={styles.error} />

                    <div className={styles.card_buttons_container}>
                      <button type="submit">
                        <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Confirmar
                      </button>
                      <button type="button" onClick={closeModalItemEdit}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </Formik>
            )}
          </div>
          <div className={styles.overlay} onClick={closeModalItemEdit}></div>
        </div>
      </Modal>




      <Modal open={isModalOpenSubItemEdit} onClose={closeModalSubItemEdit}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Funcionalidades Subitem</h3>
            {selectedSubMenu && (
              <Formik
                initialValues={{
                  CodigoSubItem: selectedSubMenu.PK_TMSSUBITEM_MENU,
                  CodigoItem: selectedSubMenu.PK_TMS_ITEM_MENU,
                  NombreSubItem: selectedSubMenu.SME_NOMBRE,
                  URLSubItem: selectedSubMenu.SME_URL,
                  IconoSubItem: selectedSubMenu.SME_ICON,
                  CodFuncionalidad: funcionalidadesPorPerfil.map((funcionalidadPorPerfil) => funcionalidadPorPerfil.PK_TMSFUNCIONALIDAD),
                }}

                onSubmit={addFuntionsSubItem} // Función para actualizar el subítem
                validateOnChange={true}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                  <form onSubmit={handleSubmit}>
                    <div>

                      <input
                        type="text"
                        id="CodigoSubItem"
                        name="CodigoSubItem"
                        value={values.CodigoSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        hidden
                      />
                      {touched.CodigoSubItem && errors.CodigoSubItem && <div>{errors.CodigoSubItem}</div>}
                    </div>

                    <label htmlFor="Funcionalidad">Funcionalidad</label>
                    <Field name="CodFuncionalidad">
                      {({ field, form }: { field: any, form: any }) => {


                        const options = [emptyOption, ...funcionalidades.map((funcionalidad: Funcionalidad) => ({ value: funcionalidad.PK_TMSFUNCIONALIDAD, label: funcionalidad.FUN_NOMBRE }))];

                        const handleChange = (selectedOptions: any) => {
                          if (selectedOptions) {
                            form.setFieldValue(
                              field.name,
                              selectedOptions.map((option: any) => option.value)
                            );
                          }
                        };

                        const selectedValues = field.value ? [...field.value] : [];
                        console.log(selectedValues);
                        return (
                          <Select
                            {...field}
                            value={options.filter((option: any) => selectedValues.includes(option.value))}
                            options={options}
                            onChange={handleChange}
                            classNamePrefix="react-select"
                            placeholder="Selecciona la funcionalidad asociada"
                            className={`${styles.create_select}`}
                            isSearchable
                            isMulti
                          />
                        );
                      }}
                    </Field>
                    <ErrorMessage name="CodUnidad" component="div" className={styles.error} />


                    <div className={styles.card_buttons_container}>
                      <button type="submit">
                        <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Confirmar
                      </button>
                      <button type="button" onClick={closeModalSubItemEdit}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </Formik>
            )}
          </div>
          <div className={styles.overlay} onClick={closeModalSubItemEdit}></div>
        </div>
      </Modal>


      <Modal open={isModalOpenSubSubItemEdit} onClose={closeModalSubSubItemEdit}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Funcionalidades Sub Subitem</h3>
            {selectedSubSubMenu && (
              <Formik
                initialValues={{
                  CodigoSubSubItem: selectedSubSubMenu.PK_TMSSUB_SUBITEM_MENU,
                  CodigoSubItem: selectedSubSubMenu.PK_TMSSUBITEM_MENU,
                  NombreSubSubItem: selectedSubSubMenu.SSM_NOMBRE,
                  URLSubSubItem: selectedSubSubMenu.SSM_URL,
                  CodFuncionalidad: funcionalidadesPorPerfil.map((funcionalidadPorPerfil) => funcionalidadPorPerfil.PK_TMSFUNCIONALIDAD),
                }}

                onSubmit={addFuntionsSubSubItem} // Función para actualizar el sub-subítem
                validateOnChange={true}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                  <form onSubmit={handleSubmit}>
                    <div>

                      <input
                        type="text"
                        id="CodigoSubSubItem"
                        name="CodigoSubSubItem"
                        value={values.CodigoSubSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        hidden
                      />
                      {touched.CodigoSubSubItem && errors.CodigoSubSubItem && <div>{errors.CodigoSubSubItem}</div>}
                    </div>

                    <label htmlFor="Funcionalidad">Funcionalidad</label>
                    <Field name="CodFuncionalidad">
                      {({ field, form }: { field: any, form: any }) => {


                        const options = [emptyOption, ...funcionalidades.map((funcionalidad: Funcionalidad) => ({ value: funcionalidad.PK_TMSFUNCIONALIDAD, label: funcionalidad.FUN_NOMBRE }))];

                        const handleChange = (selectedOptions: any) => {
                          if (selectedOptions) {
                            form.setFieldValue(
                              field.name,
                              selectedOptions.map((option: any) => option.value)
                            );
                          }
                        };

                        const selectedValues = field.value ? [...field.value] : [];
                        console.log(selectedValues);
                        return (
                          <Select
                            {...field}
                            value={options.filter((option: any) => selectedValues.includes(option.value))}
                            options={options}
                            onChange={handleChange}
                            classNamePrefix="react-select"
                            placeholder="Selecciona la funcionalidad asociada"
                            className={`${styles.create_select}`}
                            isSearchable
                            isMulti
                          />
                        );
                      }}
                    </Field>
                    <ErrorMessage name="CodUnidad" component="div" className={styles.error} />
                    <div className={styles.card_buttons_container}>
                      <button type="submit">
                        <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Confirmar
                      </button>
                      <button type="button" onClick={closeModalSubSubItemEdit}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </Formik>
            )}
          </div>
          <div className={styles.overlay} onClick={closeModalSubSubItemEdit}></div>
        </div>
      </Modal>

    </Layout>
  );
};

export default Permisos;