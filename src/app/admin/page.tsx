import { getAllProducts } from "@/actions/product";
import { getAllCategories } from "@/actions/category";
import { Package, Tag, TrendingUp, Users } from "lucide-react";

export default async function AdminDashboard() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  const stats = [
    {
      name: "Total Products",
      value: products.length,
      icon: <Package className="h-6 w-6" />,
      color: "bg-blue-500",
    },
    {
      name: "Total Categories",
      value: categories.length,
      icon: <Tag className="h-6 w-6" />,
      color: "bg-green-500",
    },
    {
      name: "Active Products",
      value: products.filter(p => p.isActive).length,
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-yellow-500",
    },
  ];

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/products"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Package className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Manage Products</h3>
              <p className="text-sm text-gray-600">Add, edit, or remove products</p>
            </div>
          </a>
          <a
            href="/admin/categories"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Tag className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Manage Categories</h3>
              <p className="text-sm text-gray-600">Organize your product categories</p>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}
