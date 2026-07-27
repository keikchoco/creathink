'use server'

import { projectService } from '@/services/project.service';
import React from 'react'

const GetData = async () => {
  try {
    const result = await projectService.list({ status: "published" }, { limit: 100 })
    console.log(result)
    return result.items.map((item) => ({ id: String(item._id), title: item.title }))
  } catch {
    return []
  }
}

export default GetData