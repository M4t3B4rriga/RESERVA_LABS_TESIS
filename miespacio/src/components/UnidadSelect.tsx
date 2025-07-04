import React from 'react';
import Select from 'react-select';

const UnidadSelect = ({ unidades, value, onChange }:{unidades: any, value: any, onChange: () => void}) => {
  return (
    <Select
      options={unidades}
      value={value}
      onChange={onChange}
    />
  );
};

export default UnidadSelect;