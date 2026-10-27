import { createBrowserRouter, Link, Outlet, RouterProvider, ScrollRestoration, useParams } from 'react-router'
import { BookView } from '@/book/BookView'
import { Home } from '@/Home'
import { Landing } from '@/landing/Landing'
import { LESSONS } from '@/lessons'
import { Player } from '@/Player'

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

function LessonRoute() {
  const { id } = useParams()
  const lesson = LESSONS.find((l) => l.id === id)
  if (!lesson) return <NotFound />
  return <Player key={lesson.id} lesson={lesson} />
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-ink">
      <p className="text-xl font-semibold">没有这个页面</p>
      <Link to="/lessons" className="text-bench underline underline-offset-4">
        查看全部实验
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/lessons', element: <Home /> },
      { path: '/lessons/:id', element: <LessonRoute /> },
      { path: '/book', element: <BookView /> },
      { path: '/book/:n', element: <BookView /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
