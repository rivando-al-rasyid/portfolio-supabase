import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HomePage } from '../features/home/HomePage';
import { BlogListPage } from '../features/blog/BlogListPage';
import { BlogDetailPage } from '../features/blog/BlogDetailPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { GraphPage } from '../features/graph/GraphPage';
import { AdminPage } from '../features/admin/AdminPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireAuth } from '../features/auth/RequireAuth';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'blog', element: <BlogListPage /> },
      { path: 'blog/:slug', element: <BlogDetailPage /> },
      { path: 'projects', element: <ProjectListPage /> },
      { path: 'projects/:slug', element: <ProjectDetailPage /> },
      { path: 'graph', element: <GraphPage /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <AdminPage />
          </RequireAuth>
        )
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
