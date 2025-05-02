export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kitchens: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          address: string
          city: string
          district: string | null
          price_per_hour: number
          area_sqm: number
          kitchen_type: string
          has_projector: boolean
          has_photo_zone: boolean
          has_dishwasher: boolean
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          address: string
          city: string
          district?: string | null
          price_per_hour: number
          area_sqm: number
          kitchen_type: string
          has_projector?: boolean
          has_photo_zone?: boolean
          has_dishwasher?: boolean
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          address?: string
          city?: string
          district?: string | null
          price_per_hour?: number
          area_sqm?: number
          kitchen_type?: string
          has_projector?: boolean
          has_photo_zone?: boolean
          has_dishwasher?: boolean
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      kitchen_images: {
        Row: {
          id: string
          kitchen_id: string
          image_url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          kitchen_id: string
          image_url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          kitchen_id?: string
          image_url?: string
          is_primary?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          kitchen_id: string
          renter_id: string
          start_time: string
          end_time: string
          status: string
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kitchen_id: string
          renter_id: string
          start_time: string
          end_time: string
          status?: string
          total_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kitchen_id?: string
          renter_id?: string
          start_time?: string
          end_time?: string
          status?: string
          total_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      product_sets: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product_set_items: {
        Row: {
          id: string
          product_set_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          product_set_id: string
          product_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_set_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
      }
      booking_products: {
        Row: {
          id: string
          booking_id: string
          product_id: string | null
          product_set_id: string | null
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          product_id?: string | null
          product_set_id?: string | null
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          product_id?: string | null
          product_set_id?: string | null
          quantity?: number
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          booking_id: string | null
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          booking_id?: string | null
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          booking_id?: string | null
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}
