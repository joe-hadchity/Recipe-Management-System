import TextInput from "./TextInput";

export default function NumberInput(props) {
  return <TextInput type="number" inputMode="decimal" step="any" {...props} />;
}
