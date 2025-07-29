import ScoopedCorner from "../components/ScoopedCorner";

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#4a5568' // A dark background to see the white shape
    }}>
      <div style={{ width: '300px', height: '300px' }}>
        <ScoopedCorner 
          size={300} /* Set radius to be equal to the side of the square */
          color="#ffffff" 
        />
      </div>
    </main>
  );
}
