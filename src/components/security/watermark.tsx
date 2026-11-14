/**
 * Foydalanuvchi identifikatori bilan nozik watermark. Skrinshot yoki ekran
 * yozuvi tarqalsa, u qaysi akkauntdan chiqqanini aniqlash imkonini beradi —
 * brauzerda skrinshot olishni texnik jihatdan taqiqlab bo'lmaydi.
 */
export function Watermark({
  name,
  email,
  uid,
}: {
  name: string;
  email: string;
  uid: string;
}) {
  const tag = `${name} · ${email} · ${uid.slice(0, 8)}`;

  return (
    <div className="fb-watermark" aria-hidden="true">
      {Array.from({ length: 15 }, (_, index) => (
        <span key={index}>{tag}</span>
      ))}
    </div>
  );
}
