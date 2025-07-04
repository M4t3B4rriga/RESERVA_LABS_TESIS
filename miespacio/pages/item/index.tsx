import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Accordion, AccordionDetails, AccordionSummary, Breadcrumbs, Typography, Modal } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { faSort, faSortUp, faSortDown, faSave, faTimes, faSpinner, faPrint, faFileCsv, faFilePdf, faFilter, faPlus, faUserTag, faEdit, faTrashAlt, faUndo, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/CRUD.module.css';
import 'react-notifications-component/dist/theme.css'
import { ReactNotifications } from 'react-notifications-component'
import { Store } from 'react-notifications-component';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Layout from '@/src/components/Layout';
import Head from 'next/head';

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

const Items = ({ usuarioLogueado: InitialUsuario }: { usuarioLogueado: Auth | null }) => {
  const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(InitialUsuario);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([]);
  const [subSubMenuItems, setSubSubMenuItems] = useState<SubSubMenuItem[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpenSubItem, setModalOpenSubItem] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [isModalOpenSubSubItem, setModalOpenSubSubItem] = useState(false);
  const [selectedSubMenu, setSelectedSubMenu] = useState<SubMenuItem | null>(null);
  const [selectedSubSubMenu, setSelectedSubSubMenu] = useState<SubSubMenuItem | null>(null);
  //edit
  const [isModalOpenItemEdit, setModalOpenItemEdit] = useState(false);
  const [isModalOpenSubItemEdit, setModalOpenSubItemEdit] = useState(false);
  const [isModalOpenSubSubItemEdit, setModalOpenSubSubItemEdit] = useState(false);
  //edit
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchData = async () => {
        console.log('Aca hizo una llamada al servidor desde el cliente');
        const response = await axios.get(`${API_BASE_URL}/api/item`);
        console.log(response);
        setMenuItems(response.data.menuItems);
        setSubMenuItems(response.data.subMenuItems);
        setSubSubMenuItems(response.data.subSubMenuItems);
      };
      fetchData();
    }
  }, []);
  //Ediciones
  const openModalItemEdit = (menuItem: MenuItem) => {
    setModalOpenItemEdit(true);
    setSelectedMenu(menuItem); // Almacena el item seleccionado
  };
  const closeModalItemEdit = () => {
    setModalOpenItemEdit(false);
  };

  const openModalSubItemEdit = (menuSubItem: SubMenuItem) => {
    setModalOpenSubItemEdit(true);
    setSelectedSubMenu(menuSubItem); // Almacena el subitem seleccionado
  };
  const closeModalSubItemEdit = () => {
    setModalOpenSubItemEdit(false);
  };

  const openModalSubSubItemEdit = (subSubMenuItem: SubSubMenuItem) => {
    setModalOpenSubSubItemEdit(true);
    setSelectedSubSubMenu(subSubMenuItem); // Almacena el subsubitem seleccionado
  };
  const closeModalSubSubItemEdit = () => {
    setModalOpenSubSubItemEdit(false);
  };

  const editItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    setSubmitting(true);
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/item/${values.CodigoItem}`, {
        itemType: 'item',
        NombreItem: values.NombreItem,
        URLItem: values.URLItem,
        IconoItem: values.IconoItem,
      });
      const updatedItem = response.data.menuItems[0];
      console.log(updatedItem);
      setMenuItems(menuItems.map((menuItem) =>
        menuItem.PK_TMS_ITEM_MENU === updatedItem.PK_TMS_ITEM_MENU ? updatedItem : menuItem
      ));
      setModalOpenItemEdit(false);
      Store.addNotification({
        title: "Item editad con exito",
        message: "El item " + response.data.menuItems[0].IME_NOMBRE + " se ha editado con éxito",
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
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar el item",
        message: "Lo sentimos ha ocurido un problema al editar el item vuelva a intentarlo mas tarde",
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
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };
  const editSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    setSubmitting(true);
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/item/${values.CodigoSubItem}`, {
        itemType: 'subitem',
        CodigoItem: values.CodigoItem,
        NombreSubItem: values.NombreSubItem,
        URLSubItem: values.URLSubItem,
        IconoSubItem: values.IconoSubItem,
      });
      const updatedSubItem = response.data.subMenuItems[0];
      console.log(updatedSubItem);
      console.log(subMenuItems);
      setSubMenuItems(subMenuItems.map((subMenuItem) =>
        ((subMenuItem.PK_TMSSUBITEM_MENU === updatedSubItem.PK_TMSSUBITEM_MENU) && (subMenuItem.PK_TMS_ITEM_MENU === updatedSubItem.PK_TMS_ITEM_MENU)) ? updatedSubItem : subMenuItem
      ));
      setModalOpenSubItemEdit(false);
      Store.addNotification({
        title: "Unidad editada con exito",
        message: "El subItem " + response.data.subMenuItems[0].SME_NOMBRE + " se ha editado con éxito",
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
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar la unidad",
        message: "Lo sentimos ha ocurido un problema al editar la unidad vuelva a intentarlo mas tarde",
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
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };
  const editSubSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    setSubmitting(true);
    setIsLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/item/${values.CodigoSubSubItem}`, {
        itemType: 'subsubitem',
        CodigoSubItem: values.CodigoSubItem,
        NombreSubSubItem: values.NombreSubSubItem,
        URLSubSubItem: values.URLSubSubItem,
      });
      const updatedSubSubItem = response.data.subSubMenuItems[0];
      console.log(updatedSubSubItem);
      console.log(subSubMenuItems);
      setSubSubMenuItems(subSubMenuItems.map((subsubMenuItem) =>
        ((subsubMenuItem.PK_TMSSUB_SUBITEM_MENU === updatedSubSubItem.PK_TMSSUB_SUBITEM_MENU) && (subsubMenuItem.PK_TMSSUBITEM_MENU === updatedSubSubItem.PK_TMSSUBITEM_MENU)) ? updatedSubSubItem : subsubMenuItem
      ));
      setModalOpenSubSubItemEdit(false);
      Store.addNotification({
        title: "Sub Sub editada con exito",
        message: "El Sub SubItem " + response.data.subSubMenuItems[0].SSM_NOMBRE + " se ha editado con éxito",
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
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar la unidad",
        message: "Lo sentimos ha ocurido un problema al editar la unidad vuelva a intentarlo mas tarde",
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
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };

  //Ediciones
  //Eliminar
  const deleteItem = async (values: any, CodigoItem: number) => {

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/item/${CodigoItem}`, {
        data: {
          itemType: 'item'
        }
      });
      const deleteItem = response.data.menuItems[0];
      console.log(deleteItem);
      setMenuItems(menuItems.filter((menuItem) =>
        menuItem.PK_TMS_ITEM_MENU !== deleteItem.PK_TMS_ITEM_MENU
      ));
      Store.addNotification({
        title: "Item eliminado con exito",
        message: "El item " + deleteItem.IME_NOMBRE + " se ha editado con éxito",
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
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar el item",
        message: "Lo sentimos ha ocurido un problema al eliminar el item vuelva a intentarlo mas tarde",
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
      console.error(error);
    }
  };

  const deleteSubItem = async (CodigoSubItem: number) => {

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/item/${CodigoSubItem}`,
        {
          data: {
            itemType: 'subitem'
          }
        }
      );
      const updatedSubItem = response.data.subMenuItems[0];
      console.log(updatedSubItem);
      console.log(subMenuItems);
      setSubMenuItems(subMenuItems.filter((subMenuItem) =>
        !(subMenuItem.PK_TMSSUBITEM_MENU === updatedSubItem.PK_TMSSUBITEM_MENU && subMenuItem.PK_TMS_ITEM_MENU === updatedSubItem.PK_TMS_ITEM_MENU)
      ));

      setModalOpenSubItemEdit(false);
      Store.addNotification({
        title: "Sub Item eliminado con exito",
        message: "El SubItem " + updatedSubItem.SME_NOMBRE + " se ha eliminado con éxito",
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
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar la unidad",
        message: "Lo sentimos ha ocurido un problema al editar la unidad vuelva a intentarlo mas tarde",
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
      console.error(error);
    }

  };

  const deleteSubSubItem = async (CodigoSubSubItem: number) => {

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/item/${CodigoSubSubItem}`,
        {
          data: {
            itemType: 'subsubitem'
          }
        }
      );
      const updatedSubSubItem = response.data.subSubMenuItems[0];
      console.log(updatedSubSubItem);
      console.log(subSubMenuItems);
      setSubSubMenuItems(subSubMenuItems.filter((subsubMenuItem) =>
        !(subsubMenuItem.PK_TMSSUB_SUBITEM_MENU === updatedSubSubItem.PK_TMSSUB_SUBITEM_MENU && subsubMenuItem.PK_TMSSUBITEM_MENU === updatedSubSubItem.PK_TMSSUBITEM_MENU)
      ));

      setModalOpenSubSubItemEdit(false);
      Store.addNotification({
        title: "Sub Sub eliminado con exito",
        message: "El Sub SubItem " + updatedSubSubItem.SSM_NOMBRE + " se ha eliminado con éxito",
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
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al editar la unidad",
        message: "Lo sentimos ha ocurido un problema al editar la unidad vuelva a intentarlo mas tarde",
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
      console.error(error);
    }

  };

  //Eliminar
  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const initialValues = {
    NombreItem: '',
    URLItem: '',
    IconoItem: ''
  };

  const validationSchema = Yup.object().shape({
    /*NombreItem: Yup.string().required('Campo obligatorio1'),
    NombreSubItem: Yup.string().required('Campo obligatorio2'),
    NombreSubSubItem: Yup.string().required('Campo obligatorio3'),
    URLItem: Yup.string().required('Campo obligatorio4'),
    URLSubItem: Yup.string().required('Campo obligatorio5'),
    URLSubSubItem: Yup.string().required('Campo obligatorio6'),
    IconoItem: Yup.string().required('Campo obligatorio7'),
    IconoSubItem: Yup.string().required('Campo obligatorio8'),
    IconoSubSubItem: Yup.string().required('Campo obligatorio9')*/
  });
  const createItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    console.log("si me llamaron");
    setSubmitting(true);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/item`, {
        itemType: 'item',
        NombreItem: values.NombreItem,
        URLItem: values.URLItem,
        IconoItem: values.IconoItem,
      });
      console.log(response.data);
      const newItem = response.data.menuItems[0];
      console.log(response.data.menuItems[0]);
      setMenuItems([...menuItems, newItem]);
      console.log(menuItems);
      setModalOpen(false);
      Store.addNotification({
        title: "Item creado con exito",
        message: "El item " + response.data.menuItems[0].IME_NOMBRE + " se ha creado con éxito",
        type: "success",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al crear el item",
        message: "Lo sentimos ha ocurido un problema al crear el item vuelva a intentarlo mas tarde",
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };
  const createSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    console.log("si me llamaron" + values.CodigoItem);
    setSubmitting(true);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/item`, {
        itemType: 'subitem',
        ItemMenu: values.CodigoItem,
        NombreSubItem: values.NombreSubItem,
        URLSubItem: values.URLSubItem,
        IconoSubItem: values.IconoSubItem,
      });
      console.log(response.data);
      const newSubItem = response.data.subMenuItems[0];
      console.log(response.data.subMenuItems[0]);
      setSubMenuItems([...subMenuItems, newSubItem]);
      console.log(subMenuItems);
      setModalOpenSubItem(false);
      Store.addNotification({
        title: "SubItem creado con exito",
        message: "El Subitem " + response.data.subMenuItems[0].SME_NOMBRE + " se ha creado con éxito",
        type: "success",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al crear el item",
        message: "Lo sentimos ha ocurido un problema al crear el item vuelva a intentarlo mas tarde",
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };
  const createSubSubItem = async (values: any, { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void; }) => {
    setSubmitting(true);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/item`, {
        itemType: 'subsubitem',
        ItemSubMenu: values.CodigoSubItem,
        NombreSubSubItem: values.NombreSubSubItem,
        URLSubSubItem: values.URLSubSubItem,
      });
      console.log(response.data);
      const newSubSubItem = response.data.subSubMenuItems[0];
      console.log(response.data.subSubMenuItems[0]);
      setSubSubMenuItems([...subSubMenuItems, newSubSubItem]);
      console.log(subSubMenuItems);
      setModalOpenSubSubItem(false);
      Store.addNotification({
        title: "Sub SubItem creado con exito",
        message: "El Sub Subitem " + response.data.subSubMenuItems[0].SSM_NOMBRE + " se ha creado con éxito",
        type: "success",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      resetForm();
    } catch (error) {
      Store.addNotification({
        title: "Ha ocurrido un problema al crear el Sub SubItem",
        message: "Lo sentimos ha ocurido un problema al crear el Sub Subitem vuelva a intentarlo mas tarde",
        type: "danger",
        insert: "top",
        container: "top-left",
        animationIn: ["animate__animated", "animate__fadeIn"],
        animationOut: ["animate__animated", "animate__fadeOut"],
        dismiss: {
          duration: 3500,
          onScreen: true
        }
      });
      console.error(error);
    }
    setIsLoading(false);
    setSubmitting(false);
  };
  const openModalSubItem = (menuItem: MenuItem) => {
    setModalOpenSubItem(true);
    setSelectedMenu(menuItem); // Nuevo estado para almacenar el subMenuItem seleccionado
  };

  const closeModalSubItem = () => {
    setModalOpenSubItem(false);
  };
  const openModalSubSubItem = (menuSubItem: SubMenuItem) => {
    setModalOpenSubSubItem(true);
    setSelectedSubMenu(menuSubItem); // Nuevo estado para almacenar el subMenuItem seleccionado
  };

  const closeModalSubSubItem = () => {
    setModalOpenSubSubItem(false);
  };

  const handlePermisos = () => {
    router.push('/permisos');
  }

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
            <div style={{ marginLeft: 'auto' }}>
              <FontAwesomeIcon icon={faEdit} onClick={() => openModalSubSubItemEdit(subSubMenuItem)} />
              <FontAwesomeIcon icon={faTrashAlt} onClick={() => deleteSubSubItem(subSubMenuItem.PK_TMSSUB_SUBITEM_MENU)} />
            </div>
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
              <div style={{ marginLeft: 'auto' }}>
                <FontAwesomeIcon icon={faEdit} onClick={() => openModalSubItemEdit(subMenuItem)} />
                <FontAwesomeIcon icon={faTrashAlt} onClick={() => deleteSubItem(subMenuItem.PK_TMSSUBITEM_MENU)} />
                <FontAwesomeIcon icon={faPlus} onClick={() => openModalSubSubItem(subMenuItem)} />
              </div>
            </AccordionSummary>
            <AccordionDetails>
              <ul>
                {renderSubSubItems(subMenuItem)}
              </ul>
            </AccordionDetails>
          </Accordion>
        </li>
      ));
  };

  const renderItems = () => {
    return menuItems.map((menuItem) => (
      <li key={menuItem.PK_TMS_ITEM_MENU}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginRight: '10px' }}>
              <Typography>{menuItem.IME_NOMBRE}</Typography>
              <div style={{ display: 'flex', marginLeft: 'auto', gap: '8px', flexDirection: 'row', flexWrap: 'nowrap' }}>
                <FontAwesomeIcon icon={faEdit} onClick={() => openModalItemEdit(menuItem)} />
                <FontAwesomeIcon icon={faTrashAlt} onClick={() => deleteItem(null, menuItem.PK_TMS_ITEM_MENU)} />
                <FontAwesomeIcon icon={faPlus} onClick={() => openModalSubItem(menuItem)} />
              </div>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ul>
              {renderSubMenuItems(menuItem)}
            </ul>
          </AccordionDetails>
        </Accordion>
      </li>
    ));
  };

  return (
    <Layout usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>ítems</title>
      </Head>
      <ReactNotifications />
      <h1>Items</h1>
      <div className={styles.crud_container}>
        <button type="button" onClick={openModal} className={styles.crud_normal_button}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: '5px' }} /> Crear
        </button>
        <button type="button" onClick={handlePermisos} className={styles.crud_normal_button}>
          <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Gestionar Permisos
        </button>
        <nav className={styles.items_container}>
          <ul className={styles.navItems}>
            {renderItems()}
          </ul>
        </nav>
      </div>
      <Modal open={isModalOpen} onClose={closeModal}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Crear Item</h3>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={createItem}
              validateOnChange={true}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <label htmlFor="NombreItem">Nombre</label>
                  <Field id="NombreItem" name="NombreItem" placeholder="Ingresa el nombre del item" className={errors.NombreItem && touched.NombreItem ? styles.error_input : ''} />
                  <ErrorMessage name="NombreItem" component="div" className={styles.error} />

                  <label htmlFor="URLItem">URL</label>
                  <Field id="URLItem" name="URLItem" placeholder="Ingresa la URL" className={errors.URLItem && touched.URLItem ? styles.error_input : ''} />
                  <ErrorMessage name="URLItem" component="div" className={styles.error} />


                  <label htmlFor="IconoItem">Icono</label>
                  <Field id="IconoItem" name="IconoItem" placeholder="Ingresa el icono" className={errors.IconoItem && touched.IconoItem ? styles.error_input : ''} />
                  <ErrorMessage name="IconoItem" component="div" className={styles.error} />

                  {isSubmitting ? (
                    <div className={styles.card_buttons_container}>
                      <div className={styles.load_icon}>
                        <FontAwesomeIcon icon={faSpinner} spin />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.card_buttons_container}>
                      <button type="submit" disabled={isSubmitting}>
                        <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Crear
                      </button>
                      <button type="button" onClick={closeModal}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                      </button>
                    </div>
                  )}
                </Form>
              )}
            </Formik>
          </div>
          <div className={styles.overlay} onClick={closeModal}></div>
        </div>
      </Modal>
      <Modal open={isModalOpenSubItem} onClose={closeModalSubItem}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Crear Subitem</h3>
            <Formik
              initialValues={{
                NombreSubItem: '',
                URLSubItem: '',
                IconoSubItem: '',
                CodigoItem: selectedMenu ? selectedMenu.PK_TMS_ITEM_MENU : ''
              }}
              validationSchema={validationSchema}
              onSubmit={createSubItem}
              validateOnChange={true}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <Field
                    id="ItemMenu"
                    name="ItemMenu"
                    placeholder="ItemMenu"
                    value={selectedMenu ? selectedMenu.PK_TMS_ITEM_MENU : ''}
                    hidden
                  />
                  <ErrorMessage name="ItemMenu" component="div" className={styles.error} />

                  <label htmlFor="NombreSubItem">Nombre</label>
                  <Field id="NombreSubItem" name="NombreSubItem" placeholder="Ingresa el nombre del item" className={errors.NombreSubItem && touched.NombreSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="NombreSubItem" component="div" className={styles.error} />

                  <label htmlFor="URLSubItem">URL</label>
                  <Field id="URLSubItem" name="URLSubItem" placeholder="Ingresa la URL" className={errors.URLSubItem && touched.URLSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="URLSubItem" component="div" className={styles.error} />


                  <label htmlFor="IconoSubItem">Icono</label>
                  <Field id="IconoSubItem" name="IconoSubItem" placeholder="Ingresa el icono" className={errors.IconoSubItem && touched.IconoSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="IconoSubItem" component="div" className={styles.error} />

                  <div className={styles.card_buttons_container}>
                    <button type="submit" disabled={isSubmitting}>
                      <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Crear
                    </button>
                    <button type="button" onClick={closeModalSubItem}>
                      <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
          <div className={styles.overlay} onClick={closeModalSubItem}></div>
        </div>
      </Modal>
      <Modal open={isModalOpenSubSubItem} onClose={closeModalSubSubItem}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Crear Sub Subitem</h3>
            <Formik
              initialValues={{
                NombreSubSubItem: '',
                URLSubSubItem: '',
                IconoSubSubItem: '',
                CodigoSubItem: selectedSubMenu ? selectedSubMenu.PK_TMSSUBITEM_MENU : ''
              }}
              validationSchema={validationSchema}
              onSubmit={createSubSubItem}
              validateOnChange={true}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form>
                  <Field
                    id="ItemSubMenu"
                    name="ItemSubMenu"
                    placeholder="ItemSubMenu"
                    value={selectedSubMenu ? selectedSubMenu.PK_TMSSUBITEM_MENU : ''}
                    hidden
                  />
                  <ErrorMessage name="ItemMenu" component="div" className={styles.error} />

                  <label htmlFor="NombreSubSubItem">Nombre</label>
                  <Field id="NombreSubSubItem" name="NombreSubSubItem" placeholder="Ingresa el nombre del item" className={errors.NombreSubSubItem && touched.NombreSubSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="NombreSubSubItem" component="div" className={styles.error} />

                  <label htmlFor="URLSubSubItem">URL</label>
                  <Field id="URLSubSubItem" name="URLSubSubItem" placeholder="Ingresa la URL" className={errors.URLSubSubItem && touched.URLSubSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="URLSubSubItem" component="div" className={styles.error} />


                  <label htmlFor="IconoSubSubItem">Icono</label>
                  <Field id="IconoSubSubItem" name="IconoSubSubItem" placeholder="Ingresa el icono" className={errors.IconoSubSubItem && touched.IconoSubSubItem ? styles.error_input : ''} />
                  <ErrorMessage name="IconoSubSubItem" component="div" className={styles.error} />

                  <div className={styles.card_buttons_container}>
                    <button type="submit" disabled={isSubmitting}>
                      <FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }} /> Crear
                    </button>
                    <button type="button" onClick={closeModalSubSubItem}>
                      <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }} /> Cancelar
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
          <div className={styles.overlay} onClick={closeModalSubSubItem}></div>
        </div>
      </Modal>

      <Modal open={isModalOpenItemEdit} onClose={closeModalItemEdit}>
        <div className={styles.modal}>
          <div className={styles.card}>
            <h3>Editar Item</h3>
            {selectedMenu && (
              <Formik
                initialValues={{
                  CodigoItem: selectedMenu.PK_TMS_ITEM_MENU,
                  NombreItem: selectedMenu.IME_NOMBRE,
                  URLItem: selectedMenu.IME_URL,
                  IconoItem: selectedMenu.IME_ICONO
                }}
                validationSchema={validationSchema}
                onSubmit={editItem} // Función para actualizar el item
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
                    <div>
                      <label htmlFor="NombreItem">Nombre:</label>
                      <input
                        type="text"
                        id="NombreItem"
                        name="NombreItem"
                        value={values.NombreItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.NombreItem && errors.NombreItem && <div>{errors.NombreItem}</div>}
                    </div>
                    <div>
                      <label htmlFor="URLItem">URL:</label>
                      <input
                        type="text"
                        id="URLItem"
                        name="URLItem"
                        value={values.URLItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.URLItem && errors.URLItem && <div>{errors.URLItem}</div>}
                    </div>
                    <div>
                      <label htmlFor="IconoItem">Icono:</label>
                      <input
                        type="text"
                        id="IconoItem"
                        name="IconoItem"
                        value={values.IconoItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.IconoItem && errors.IconoItem && <div>{errors.IconoItem}</div>}
                    </div>
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
            <h3>Editar Subitem</h3>
            {selectedSubMenu && (
              <Formik
                initialValues={{
                  CodigoSubItem: selectedSubMenu.PK_TMSSUBITEM_MENU,
                  CodigoItem: selectedSubMenu.PK_TMS_ITEM_MENU,
                  NombreSubItem: selectedSubMenu.SME_NOMBRE,
                  URLSubItem: selectedSubMenu.SME_URL,
                  IconoSubItem: selectedSubMenu.SME_ICON
                }}
                validationSchema={validationSchema}
                onSubmit={editSubItem} // Función para actualizar el subítem
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
                    <div>
                      <label htmlFor="NombreSubItem">Nombre:</label>
                      <input
                        type="text"
                        id="NombreSubItem"
                        name="NombreSubItem"
                        value={values.NombreSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.NombreSubItem && errors.NombreSubItem && <div>{errors.NombreSubItem}</div>}
                    </div>
                    <div>
                      <label htmlFor="URLSubItem">URL:</label>
                      <input
                        type="text"
                        id="URLSubItem"
                        name="URLSubItem"
                        value={values.URLSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.URLSubItem && errors.URLSubItem && <div>{errors.URLSubItem}</div>}
                    </div>
                    <div>
                      <label htmlFor="IconoSubItem">Icono:</label>
                      <input
                        type="text"
                        id="IconoSubItem"
                        name="IconoSubItem"
                        value={values.IconoSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.IconoSubItem && errors.IconoSubItem && <div>{errors.IconoSubItem}</div>}
                    </div>
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
            <h3>Editar Sub Subitem</h3>
            {selectedSubSubMenu && (
              <Formik
                initialValues={{
                  CodigoSubSubItem: selectedSubSubMenu.PK_TMSSUB_SUBITEM_MENU,
                  CodigoSubItem: selectedSubSubMenu.PK_TMSSUBITEM_MENU,
                  NombreSubSubItem: selectedSubSubMenu.SSM_NOMBRE,
                  URLSubSubItem: selectedSubSubMenu.SSM_URL,
                }}
                validationSchema={validationSchema}
                onSubmit={editSubSubItem} // Función para actualizar el sub-subítem
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
                    <div>
                      <label htmlFor="NombreSubSubItem">Nombre:</label>
                      <input
                        type="text"
                        id="NombreSubSubItem"
                        name="NombreSubSubItem"
                        value={values.NombreSubSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.NombreSubSubItem && errors.NombreSubSubItem && <div>{errors.NombreSubSubItem}</div>}
                    </div>
                    <div>
                      <label htmlFor="URLSubSubItem">URL:</label>
                      <input
                        type="text"
                        id="URLSubSubItem"
                        name="URLSubSubItem"
                        value={values.URLSubSubItem}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {touched.URLSubSubItem && errors.URLSubSubItem && <div>{errors.URLSubSubItem}</div>}
                    </div>
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

export default Items;
