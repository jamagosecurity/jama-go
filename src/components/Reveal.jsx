import useReveal from "../hooks/useReveal.js";

// Wraps an element with the scroll-reveal behaviour. Pass `as` to change the tag.
export default function Reveal({ as: Tag = "div", children, ...props }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  );
}
