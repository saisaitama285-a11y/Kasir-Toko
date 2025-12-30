// Ganti dengan data dari Firebase Console > Project Settings > Web Apps
const firebaseConfig = {


  apiKey: "AIzaSyCqlgi-B8nUBRuL8bHh10rBuAdIQ9EBk9U",


  authDomain: "kasir-toko-2eb38.firebaseapp.com",


  projectId: "kasir-toko-2eb38",


  storageBucket: "kasir-toko-2eb38.firebasestorage.app",


  messagingSenderId: "384536807400",


  appId: "1:384536807400:web:6e05e4677423449306865d",


  };

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Helper Global
const getPublicCol = (col) => db.collection(col);

// Data User Sementara (Pastikan Role 'spv' agar dashboard muncul)
const currentUser = {
    name: "User Admin",
    outlet: "Pusat",
    role: "spv" 
};
