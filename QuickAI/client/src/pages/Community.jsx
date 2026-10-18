import React, { useState } from 'react'
import { dummyPublishedCreationData } from '../assets/assets'
import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useAuth, useUser } from '@clerk/react'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL


const Community = () => {
  const [creations, setCreations] = useState([])
  const {user} = useUser()
   const [loading, setLoading] = useState(true)
  const { getToken } = useAuth()

  const fetchCreations = async ()=>{
    try {
      const {data} = await axios.get('/api/user/get-published-creations', {
        headers : {Authorization: `Bearer ${await getToken()}`}
      })
      if (data.success){
        setCreations(data.creations)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
    setLoading(false)
  }

  const imageLikeToggle = async (id)=>{
    try {
      const {data} = await axios.post('/api/user/toggle-like-creation', {id}, {
        headers : {Authorization: `Bearer ${await getToken()}`}
      })

      if (data.success){
        toast.success(data.message)
        await fetchCreations()
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    if(user){
      fetchCreations()
    }
  },[user])
  return !loading ? (
    <div className='flex-1 h-full flex flex-col gap-4 p-6'>
      Creations
      <div className='bg-white h-full w-full rounded-xl overflow-y-scroll p-4'>
        {creations.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 text-gray-400'>
            <p>No community creations yet. Be the first to publish one!</p>
          </div>
        ) : (
          creations.map((creation, index) => {
            const likesArray = Array.isArray(creation.likes) ? creation.likes : [];
            const isLiked = user?.id ? likesArray.includes(user.id) : false;
            return (
              <div key={creation.id || index} className='relative group inline-block p-2 w-full sm:w-1/2 lg:w-1/3'>
                <img src={creation.content} alt={creation.prompt || "Creation"} className='w-full h-64 object-cover rounded-lg'/>

                <div className='absolute inset-2 flex gap-2 items-end justify-between p-3 bg-gradient-to-t from-black/80 via-transparent to-transparent text-white rounded-lg opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'>
                  <p className='text-sm line-clamp-2'>{creation.prompt}</p>
                  <div className='flex gap-1 items-center shrink-0'>
                    <p className='text-sm'>{likesArray.length}</p>
                    <Heart onClick={()=> imageLikeToggle(creation.id)} className={`w-5 h-5 hover:scale-110 cursor-pointer transition ${isLiked ? 'fill-red-500 text-red-600' : 'text-white'}`}/>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : (
    <div className='flex justify-center items-center h-full'>
      <span className='w-10 h-10 my-1 rounded-full border-3 border-primary border-t-transparent animate-spin'></span>
    </div>
  )
}

export default Community
