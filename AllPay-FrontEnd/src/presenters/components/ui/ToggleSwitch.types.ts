/**
 * Tipos y interfaces para el componente ToggleSwitch
 */

// Tamaños disponibles para el ToggleSwitch
export type ToggleSwitchSize = 'sm' | 'md' | 'lg';

// Variantes de color disponibles
export type ToggleSwitchVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

// Posiciones disponibles para la etiqueta
export type ToggleSwitchLabelPosition = 'left' | 'right';

// Interface principal para las props del ToggleSwitch
export interface ToggleSwitchProps {
  /** Estado del switch (activo/inactivo) */
  checked: boolean;
  /** Función que se ejecuta al cambiar el estado */
  onChange: (checked: boolean) => void;
  /** Texto de la etiqueta */
  label?: string;
  /** Descripción adicional */
  description?: string;
  /** Tamaño del switch */
  size?: ToggleSwitchSize;
  /** Variante de color */
  variant?: ToggleSwitchVariant;
  /** Estado deshabilitado */
  disabled?: boolean;
  /** Estado de cargando */
  loading?: boolean;
  /** Mostrar iconos en el switch */
  showIcons?: boolean;
  /** Posición de la etiqueta */
  labelPosition?: ToggleSwitchLabelPosition;
  /** Clase CSS adicional */
  className?: string;
  /** ID del elemento */
  id?: string;
  /** Nombre para formularios */
  name?: string;
  /** Modo oscuro */
  darkMode?: boolean;
  /** Atributos ARIA adicionales */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// Configuración de estilos por tamaño
export interface ToggleSwitchSizeConfig {
  switch: string;
  thumb: string;
  translate: string;
  focus: string;
  text: string;
}

// Configuración de estilos por variante
export interface ToggleSwitchVariantConfig {
  bg: string;
  ring: string;
  thumb: string;
}

// Hook personalizado para manejar el estado del ToggleSwitch
export interface UseToggleSwitchReturn {
  checked: boolean;
  toggle: () => void;
  setChecked: (checked: boolean) => void;
}

export interface UseToggleSwitchProps {
  initialChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}