import styles from './project.module.css';

const ProjectPage = () => {
  const weeks = ['1주차', '2주차', '3주차', '4주차'];

  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>My Project</h1>
      <div className={styles.cardContainer}>
        {weeks.map((week, index) => (
          <div key={index} className={styles.card}>
            <h2 className={styles.title}>{week}</h2>
          </div>
        ))}
      </div>
    </main>
  );
};

export default ProjectPage; 