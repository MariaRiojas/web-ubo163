import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FileText, DollarSign, Users, ClipboardList, Download, Printer, Eye, Filter } from "lucide-react"
import SolicitudesPanel from "@/components/solicitudes-panel"

export default function AreaAdministracion() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Área de Administración</h1>
          <p className="text-gray-400">Gestión administrativa y financiera</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <FileText className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="documentos" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start">
          <TabsTrigger value="documentos" className="data-[state=active]:bg-red-600">
            Documentos
          </TabsTrigger>
          <TabsTrigger value="finanzas" className="data-[state=active]:bg-red-600">
            Finanzas
          </TabsTrigger>
          <TabsTrigger value="personal" className="data-[state=active]:bg-red-600">
            Personal
          </TabsTrigger>
          <TabsTrigger value="inventario" className="data-[state=active]:bg-red-600">
            Inventario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Documentos Administrativos</CardTitle>
              <CardDescription className="text-gray-400">Gestión de documentos oficiales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Informe Anual 2023", date: "15/01/2024", type: "PDF", size: "4.2 MB" },
                  { title: "Presupuesto 2024", date: "05/12/2023", type: "XLSX", size: "2.8 MB" },
                  { title: "Acta Reunión Directiva", date: "20/02/2024", type: "DOCX", size: "1.5 MB" },
                  { title: "Plan Operativo Anual", date: "10/01/2024", type: "PDF", size: "3.7 MB" },
                  { title: "Inventario General", date: "01/03/2024", type: "XLSX", size: "5.1 MB" },
                ].map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-red-900/50 rounded-lg mr-4">
                        <FileText className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">{doc.date}</p>
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 border-gray-600">
                            {doc.type}
                          </Badge>
                          <span className="text-xs text-gray-500">{doc.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <Download className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <Printer className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finanzas" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gestión Financiera</CardTitle>
              <CardDescription className="text-gray-400">Control de presupuesto y finanzas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { title: "Presupuesto Anual", value: "$250,000", change: "+5%" },
                  { title: "Gastos Acumulados", value: "$85,420", change: "-2%" },
                  { title: "Fondos Disponibles", value: "$164,580", change: "+8%" },
                ].map((item, index) => (
                  <Card key={index} className="bg-gray-750 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-400">{item.title}</p>
                          <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
                        </div>
                        <div className="p-2 bg-red-900/50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-red-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Badge
                          variant="outline"
                          className={`
                          ${item.change.startsWith("+") ? "text-green-400 border-green-800" : "text-red-400 border-red-800"}
                        `}
                        >
                          {item.change}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="h-64 bg-gray-750 rounded-lg flex items-center justify-center mb-6">
                <DollarSign className="h-16 w-16 text-gray-600" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Últimas Transacciones</h3>
                {[
                  { description: "Compra de Equipos", amount: "-$12,500", date: "15/03/2024" },
                  { description: "Donación Municipal", amount: "+$30,000", date: "10/03/2024" },
                  { description: "Mantenimiento Vehículos", amount: "-$5,800", date: "05/03/2024" },
                  { description: "Subvención Estatal", amount: "+$45,000", date: "01/03/2024" },
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-lg mr-4 ${
                          transaction.amount.startsWith("+") ? "bg-green-900/30" : "bg-red-900/30"
                        }`}
                      >
                        <DollarSign
                          className={`h-5 w-5 ${
                            transaction.amount.startsWith("+") ? "text-green-400" : "text-red-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white">{transaction.description}</p>
                        <p className="text-sm text-gray-400">{transaction.date}</p>
                      </div>
                    </div>
                    <p
                      className={`font-medium ${
                        transaction.amount.startsWith("+") ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {transaction.amount}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Personal</CardTitle>
              <CardDescription className="text-gray-400">Administración de recursos humanos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <Users className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gestión de Inventario</CardTitle>
              <CardDescription className="text-gray-400">Control de equipos y materiales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gray-750 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-24 w-24 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SolicitudesPanel departamento="Área de Administración" />
    </div>
  )
}

