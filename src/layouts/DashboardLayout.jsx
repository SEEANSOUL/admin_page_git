import DashboardLayout from './layouts/DashboardLayout'

function App() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* İstatistik Kartı 1 */}
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Toplam Proje</h3>
          <p className="text-3xl font-bold mt-2 text-blue-500">12</p>
        </div>
        
        {/* İstatistik Kartı 2 */}
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Tamamlanan Görevler</h3>
          <p className="text-3xl font-bold mt-2 text-green-500">145</p>
        </div>

        {/* İstatistik Kartı 3 */}
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Aktif Üyeler</h3>
          <p className="text-3xl font-bold mt-2 text-purple-500">8</p>
        </div>
      </div>

      <div className="mt-10 p-10 border-2 border-dashed border-gray-700 rounded-2xl text-center">
        <p className="text-gray-500 text-lg">Trello Panoları Çok Yakında Burada Olacak...</p>
      </div>
    </DashboardLayout>
  )
}

export default App