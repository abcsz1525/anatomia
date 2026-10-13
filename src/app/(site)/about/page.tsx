export const metadata = { title: "Об источниках — Анатомия" };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-sm leading-relaxed md:px-6">
      <h1 className="text-2xl font-semibold">Об источниках</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3D-модель</h2>
        <p>
          Трёхмерная модель тела основана на наборе данных{" "}
          <a className="underline" href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html">BodyParts3D</a>,
          © The Database Center for Life Science, лицензия{" "}
          <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
          Модель описывает взрослого мужчину и не отражает всех анатомических вариантов.
        </p>
        <p>
          Упаковка и упрощение геометрии взяты из открытого проекта{" "}
          <a className="underline" href="https://github.com/ismailatilan-44/human-atlas">human-atlas</a> (MIT).
        </p>
        <p>Публикация: Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Ограничения</h2>
        <p>Приложение предназначено для учёбы и не является медицинским или диагностическим инструментом.</p>
      </section>
    </main>
  );
}
