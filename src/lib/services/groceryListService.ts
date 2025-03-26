import { GroceryList, GroceryListItem, mockGroceryLists } from '@/utils/productData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Product, Collaborator, ListActivity } from '@/lib/types/store';

// Database types
type DbGroceryList = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  collaborators?: string[];
  collaboration_details?: Collaborator[];
  activities?: ListActivity[];
  created_by?: string; // For backward compatibility
};

type DbGroceryItem = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  added_by: string;
  added_at: string;
  checked: boolean;
  product_data?: Product;
};

// Get user's grocery lists
export const getUserGroceryLists = async (userId: string): Promise<GroceryList[]> => {
  try {
    // Check if we have lists in localStorage (for anonymous users or fallback)
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const userLocalLists = localLists.filter((list: GroceryList) => list.createdBy === userId);
    
    // If we have local lists or we're using a mock user, return those
    if (userLocalLists.length > 0 || userId.startsWith('mock-')) {
      console.log('Using local lists for user', userId);
      return userLocalLists;
    }
    
    // Otherwise, try to fetch from Supabase
    const { data: lists, error: listsError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('user_id', userId);

    if (listsError) {
      console.error('Error fetching grocery lists:', listsError);
      // Return local lists as fallback
      return userLocalLists;
    }
    
    if (!lists || lists.length === 0) {
      return [];
    }

    // Fetch items for all lists
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .in('list_id', lists.map(list => list.id));

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return [];
    }
    
    // Fetch user's products from user_products table
    const { data: userProducts, error: productsError } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', userId);
      
    if (productsError) {
      console.error('Error fetching user products:', productsError);
      // Continue without user products, using the embedded product_data
    }
    
    // Create a map of product_id to user product for quick lookup
    const productMap = new Map();
    if (userProducts && userProducts.length > 0) {
      userProducts.forEach(product => {
        productMap.set(product.product_id, {
          id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          imageUrl: product.image_url,
          store: product.store,
          category: product.category
        });
      });
    }

    // Transform data to match application format
    return lists.map((list: DbGroceryList) => ({
      id: list.id,
      name: list.name,
      createdBy: list.created_by || list.user_id,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items
        .filter((item: DbGroceryItem) => item.list_id === list.id)
        .map((item: DbGroceryItem) => {
          // Look up product in user's product database first
          const userProduct = productMap.get(item.product_id);
          
          return {
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            addedBy: item.added_by,
            addedAt: item.added_at,
            checked: item.checked,
            // Use user's product data if available, otherwise use embedded product_data
            productData: userProduct || item.product_data
          };
        })
    }));
  } catch (error) {
    console.error('Error in getUserGroceryLists:', error);
    
    // Fallback to localStorage if Supabase fails
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    return localLists.filter((list: GroceryList) => list.createdBy === userId);
  }
};

// Get a grocery list by ID
export const getGroceryListById = async (listId: string): Promise<GroceryList | undefined> => {
  try {
    // Check localStorage first
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const localList = localLists.find((list: GroceryList) => list.id === listId);
    
    // If the list exists in localStorage, use that
    if (localList) {
      console.log('Using local list from localStorage');
      return localList;
    }
    
    // Otherwise, try to fetch from Supabase
    // Fetch list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error('Error fetching grocery list:', listError);
      return undefined;
    }

    // Fetch items for the list
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId);

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return undefined;
    }
    
    // Fetch user's products from user_products table
    const { data: userProducts, error: productsError } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', list.user_id);
      
    if (productsError) {
      console.error('Error fetching user products:', productsError);
      // Continue without user products, using the embedded product_data
    }
    
    // Create a map of product_id to user product for quick lookup
    const productMap = new Map();
    if (userProducts && userProducts.length > 0) {
      userProducts.forEach(product => {
        productMap.set(product.product_id, {
          id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          imageUrl: product.image_url,
          store: product.store,
          category: product.category
        });
      });
    }

    // Transform data to match application format
    return {
      id: list.id,
      name: list.name,
      createdBy: list.user_id,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items.map((item: DbGroceryItem) => {
        // Look up product in user's product database first
        const userProduct = productMap.get(item.product_id);
        
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          addedBy: item.added_by,
          addedAt: item.added_at,
          checked: item.checked,
          // Use user's product data if available, otherwise use embedded product_data
          productData: userProduct || item.product_data
        };
      })
    };
  } catch (error) {
    console.error('Error in getGroceryListById:', error);
    
    // Try localStorage as fallback
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    return localLists.find((list: GroceryList) => list.id === listId);
  }
};

// Add product to grocery list
export const addProductToGroceryList = async (
  listId: string,
  userId: string,
  product: Product,
  quantity: number = 1
): Promise<{ success: boolean; message?: string; list?: GroceryList }> => {
  try {
    // Normalize store name for consistency
    let normalizedStore = product.store;
    if (normalizedStore?.includes('MaxiPali') || normalizedStore === 'MaxiPali') {
      normalizedStore = 'MaxiPali';
    } else if (normalizedStore?.includes('MasxMenos') || normalizedStore === 'MasxMenos') {
      normalizedStore = 'MasxMenos';
    }
    
    // Create a normalized product with consistent store name
    const normalizedProduct = {
      ...product,
      store: normalizedStore
    };
    
    console.log('Adding product to list with store:', normalizedStore);
    
    // Check if we're using localStorage (for anonymous users or mock users)
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    // If the list exists in localStorage or it's a mock user, use localStorage
    if (listIndex !== -1 || userId.startsWith('mock-')) {
      console.log('Using localStorage for adding product to list');
      
      if (listIndex === -1) {
        return { success: false, message: 'Grocery list not found' };
      }
      
      const list = localLists[listIndex];
      const existingItemIndex = list.items.findIndex(item => item.productId === normalizedProduct.id);
      
      if (existingItemIndex !== -1) {
        // Update quantity if product already exists
        list.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const newItem: GroceryListItem = {
          id: uuidv4(),
          productId: normalizedProduct.id,
          quantity,
          addedBy: userId,
          addedAt: new Date().toISOString(),
          checked: false,
          productData: {
            id: normalizedProduct.id,
            name: normalizedProduct.name,
            brand: normalizedProduct.brand || 'Unknown',
            imageUrl: normalizedProduct.imageUrl,
            price: normalizedProduct.price,
            store: normalizedStore,
            category: normalizedProduct.category
          }
        };
        list.items.push(newItem);
      }
      
      // Update localStorage
      localStorage.setItem('grocery_lists', JSON.stringify(localLists));
      
      return { success: true, list };
    }
    
    // Otherwise, try to use Supabase
    // Check if product is already in the list
    const { data: existingItems, error: checkError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId)
      .eq('product_id', normalizedProduct.id);

    if (checkError) {
      console.error('Error checking existing items:', checkError);
      // Fall back to localStorage
      return addProductToLocalList(listId, userId, normalizedProduct, quantity);
    }

    // Store the product data in the user_products table
    const { error: productError } = await supabase
      .from('user_products')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        product_id: normalizedProduct.id,
        name: normalizedProduct.name,
        brand: normalizedProduct.brand || 'Unknown',
        image_url: normalizedProduct.imageUrl,
        price: normalizedProduct.price,
        store: normalizedStore,
        category: normalizedProduct.category || 'Grocery',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, product_id'
      });

    if (productError) {
      console.error('Error storing product data in user_products:', productError);
      // Continue anyway, as this is not critical for the grocery list
    }

    if (existingItems && existingItems.length > 0) {
      // Update quantity if product already exists
      const existingItem = existingItems[0];
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ 
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating item quantity:', updateError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, normalizedProduct, quantity);
      }
    } else {
      // Add new item
      const newItem = {
        id: uuidv4(),
        list_id: listId,
        product_id: normalizedProduct.id,
        quantity,
        added_by: userId,
        added_at: new Date().toISOString(),
        checked: false,
        product_data: {
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          brand: normalizedProduct.brand || 'Unknown',
          imageUrl: normalizedProduct.imageUrl,
          price: normalizedProduct.price,
          store: normalizedStore,
          category: normalizedProduct.category
        }
      };

      const { error: insertError } = await supabase
        .from('grocery_items')
        .insert(newItem);

      if (insertError) {
        console.error('Error inserting new item:', insertError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, normalizedProduct, quantity);
      }
    }

    // Get updated list to return
    const updatedList = await getGroceryListById(listId);
    return { 
      success: true, 
      list: updatedList 
    };
  } catch (error) {
    console.error('Error in addProductToGroceryList:', error);
    // Fall back to localStorage
    return addProductToLocalList(listId, userId, product, quantity);
  }
};

// Helper function to add product to local list (for fallback)
const addProductToLocalList = (
  listId: string, 
  userId: string, 
  product: Product, 
  quantity: number
): Promise<{ success: boolean; message?: string; list?: GroceryList }> => {
  try {
    // Normalize store name for consistency
    let normalizedStore = product.store;
    if (normalizedStore?.includes('MaxiPali') || normalizedStore === 'MaxiPali') {
      normalizedStore = 'MaxiPali';
    } else if (normalizedStore?.includes('MasxMenos') || normalizedStore === 'MasxMenos') {
      normalizedStore = 'MasxMenos';
    }
    
    // Create a normalized product with consistent store name
    const normalizedProduct = {
      ...product,
      store: normalizedStore
    };
    
    console.log('Adding product to local list with store:', normalizedStore);
    
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      return Promise.resolve({ success: false, message: 'Grocery list not found' });
    }
    
    const list = localLists[listIndex];
    const existingItemIndex = list.items.findIndex(item => item.productId === normalizedProduct.id);
    
    if (existingItemIndex !== -1) {
      // Update quantity if product already exists
      list.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: GroceryListItem = {
        id: uuidv4(),
        productId: normalizedProduct.id,
        quantity,
        addedBy: userId,
        addedAt: new Date().toISOString(),
        checked: false,
        productData: {
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          brand: normalizedProduct.brand || 'Unknown',
          imageUrl: normalizedProduct.imageUrl,
          price: normalizedProduct.price,
          store: normalizedStore,
          category: normalizedProduct.category
        }
      };
      list.items.push(newItem);
    }
    
    // Update localStorage
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    return Promise.resolve({ success: true, list });
  } catch (error) {
    console.error('Error adding product to local list:', error);
    return Promise.resolve({ success: false, message: 'Failed to add product to list' });
  }
};

// Create a new grocery list
export const createGroceryList = async (
  userId: string,
  name: string = 'My Grocery List'
): Promise<GroceryList | null> => {
  try {
    console.log(`Creating grocery list "${name}" for user ${userId}`);
    
    // If it's a mock user, just create the list in localStorage
    if (userId.startsWith('mock-')) {
      console.log('Creating list in localStorage for mock user');
      const newList: GroceryList = {
        id: uuidv4(),
        name,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    }
    
    // Create the list in Supabase
    const newListId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert new list
    const { error: insertError } = await supabase
      .from('grocery_lists')
      .insert({
        id: newListId,
        user_id: userId,
        name,
        created_at: now,
        collaborators: []
      });

    if (insertError) {
      console.error('Error creating grocery list in Supabase:', insertError);
      
      // Fall back to localStorage
      console.log('Falling back to localStorage for list creation');
      const newList: GroceryList = {
        id: newListId,
        name,
        createdBy: userId,
        createdAt: now,
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    }
    
    // Return the created list
    return {
      id: newListId,
      name,
      createdBy: userId,
      createdAt: now,
      collaborators: [],
      items: []
    };
  } catch (error) {
    console.error('Error in createGroceryList:', error);
    
    // Attempt to create in localStorage as a fallback
    try {
      const newList: GroceryList = {
        id: uuidv4(),
        name,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    } catch (localError) {
      console.error('Error creating list in localStorage:', localError);
      return null;
    }
  }
};

// Get default list for user (create if none exists)
export const getOrCreateDefaultList = async (userId: string): Promise<GroceryList> => {
  try {
    // Try to find user's lists
    const userLists = await getUserGroceryLists(userId);
    
    // Return first list if exists
    if (userLists.length > 0) {
      return userLists[0];
    }
    
    // Create new list if none exists
    const newList = await createGroceryList(userId, 'Default Grocery List');
    if (!newList) {
      throw new Error('Failed to create default grocery list');
    }
    
    return newList;
  } catch (error) {
    console.error('Error in getOrCreateDefaultList:', error);
    
    // Fallback to local mock list if we can't create one in Supabase
    const mockList: GroceryList = {
      id: uuidv4(),
      name: 'Default Grocery List',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      items: [],
      collaborators: []
    };
    
    return mockList;
  }
};

// Add a collaborator to a grocery list
export const addCollaborator = async (
  listId: string, 
  ownerUserId: string,
  collaboratorEmail: string,
  permissions: 'read' | 'write' | 'admin' = 'write'
): Promise<boolean> => {
  try {
    console.log('Adding collaborator to list:', listId);
    console.log('Current user ID:', ownerUserId);
    console.log('Collaborator email:', collaboratorEmail);
    
    // First check if the list exists (without strict ownership check)
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();
      
    if (listError) {
      console.error('Error fetching list:', listError);
      console.log('List might not exist or access denied');
      return false;
    }
    
    console.log('List found:', list.id);
    
    // Check if the user is the owner OR an admin collaborator
    let hasPermission = list.user_id === ownerUserId;
    
    // If not the owner, check if they're an admin collaborator
    if (!hasPermission && list.collaboration_details) {
      const userIsAdmin = list.collaboration_details.some(
        (c: Collaborator) => c.email === ownerUserId && c.permissions === 'admin' && c.status === 'active'
      );
      hasPermission = userIsAdmin;
    }
    
    // For now, let's be permissive during development - allow anyone to add collaborators
    // REMOVE THIS IN PRODUCTION
    hasPermission = true;
    console.log('Permission check bypassed for development');
    
    if (!hasPermission) {
      console.error('User does not have permission to add collaborators to this list');
      return false;
    }
    
    // Create a new collaborator object
    const newCollaborator: Collaborator = {
      email: collaboratorEmail,
      permissions,
      status: 'pending',
      addedAt: new Date().toISOString()
    };
    
    // Get existing collaboration details
    const collaborationDetails = list.collaboration_details || [];
    
    // Check if this collaborator already exists
    const existingIndex = collaborationDetails.findIndex(
      (c: Collaborator) => c.email.toLowerCase() === collaboratorEmail.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing collaborator
      collaborationDetails[existingIndex] = {
        ...collaborationDetails[existingIndex],
        permissions,
        status: 'pending', // Reset to pending if re-invited
        addedAt: new Date().toISOString()
      };
    } else {
      // Add new collaborator
      collaborationDetails.push(newCollaborator);
    }
    
    // Update the legacy collaborators array (string[]) for backward compatibility
    const collaborators = Array.from(new Set([
      ...(list.collaborators || []),
      collaboratorEmail
    ]));
    
    console.log('Updating list with new collaborators:', collaborators);
    console.log('Detailed collaborators:', collaborationDetails);
    
    // Update the list in Supabase
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ 
        collaborators,
        collaboration_details: collaborationDetails
      })
      .eq('id', listId);
      
    if (updateError) {
      console.error('Error adding collaborator:', updateError);
      return false;
    }
    
    console.log('Collaborator added successfully');
    
    // Send invitation email through a server function
    // This would typically be handled by a serverless function
    try {
      // For now, we'll log this. In production, you'd call a server API endpoint
      console.log(`Invitation email would be sent to ${collaboratorEmail} for list ${listId}`);
      
      // Record this activity
      await recordListActivity(listId, ownerUserId, {
        action: 'added',
        itemName: collaboratorEmail,
        userId: ownerUserId,
        userEmail: 'Owner' // This would be fetched in production
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // We don't want to fail the whole operation if just the email fails
    }
    
    return true;
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return false;
  }
};

// Check if a user has permission to access a list
export const checkListPermission = async (
  listId: string,
  userIdOrEmail: string,
  requiredPermission: 'read' | 'write' | 'admin' = 'read'
): Promise<boolean> => {
  try {
    // First check if user is the owner
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();
      
    if (listError || !list) {
      console.error('Error fetching list:', listError);
      return false;
    }
    
    // If user is the owner, they have all permissions
    if (list.user_id === userIdOrEmail) {
      return true;
    }
    
    // Check collaboration details
    const collaborationDetails = list.collaboration_details || [];
    const collaborator = collaborationDetails.find(
      (c: Collaborator) => c.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    
    if (!collaborator) {
      // For backward compatibility, check the old collaborators array
      const oldCollaborators = list.collaborators || [];
      if (!oldCollaborators.includes(userIdOrEmail)) {
        return false;
      }
      
      // If using old system, we default to write permission for all collaborators
      return requiredPermission !== 'admin'; // Old system doesn't support admin, only read/write
    }
    
    // For pending collaborators, only allow read access
    if (collaborator.status === 'pending' && requiredPermission !== 'read') {
      return false;
    }
    
    // Check permissions hierarchy
    if (requiredPermission === 'read') {
      return true; // All permission levels can read
    } else if (requiredPermission === 'write') {
      return collaborator.permissions === 'write' || collaborator.permissions === 'admin';
    } else {
      return collaborator.permissions === 'admin';
    }
  } catch (error) {
    console.error('Error in checkListPermission:', error);
    return false;
  }
};

// Record an activity on a list for notifications
export const recordListActivity = async (
  listId: string,
  userId: string,
  activity: Partial<ListActivity>
): Promise<boolean> => {
  try {
    const newActivity: ListActivity = {
      id: uuidv4(),
      listId,
      userId,
      userEmail: activity.userEmail || 'Unknown',
      action: activity.action || 'updated',
      itemName: activity.itemName,
      itemId: activity.itemId,
      timestamp: new Date().toISOString()
    };
    
    // Get the current list to retrieve its activities
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('activities, user_id, collaborators, collaboration_details')
      .eq('id', listId)
      .single();
      
    if (listError) {
      console.error('Error fetching list for activity recording:', listError);
      return false;
    }
    
    // Add the new activity to the existing activities
    const activities = [...(list.activities || []), newActivity];
    
    // Limit the number of activities stored to the most recent 50
    const limitedActivities = activities.slice(-50);
    
    // Update the list with the new activities
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ activities: limitedActivities })
      .eq('id', listId);
      
    if (updateError) {
      console.error('Error recording activity:', updateError);
      return false;
    }
    
    // Send push notifications to the list owner and collaborators
    // This would typically be handled by a server-side process
    if (userId !== list.user_id) {
      // Notify the list owner of changes by a collaborator
      sendPushNotification(list.user_id, {
        title: 'Grocery List Updated',
        body: `${activity.userEmail} ${activity.action} ${activity.itemName || 'an item'} in your list.`,
        data: {
          listId,
          activityId: newActivity.id,
          type: 'list_activity'
        }
      });
    }
    
    // Notify other collaborators
    const collaborators = list.collaboration_details || [];
    for (const collaborator of collaborators) {
      // Don't notify the user who made the change
      if (collaborator.email !== activity.userEmail) {
        // In a real implementation, you would look up the user ID from the email
        // For now, we just use the email as a placeholder
        sendPushNotification(collaborator.email, {
          title: 'Grocery List Updated',
          body: `${activity.userEmail} ${activity.action} ${activity.itemName || 'an item'} in a shared list.`,
          data: {
            listId,
            activityId: newActivity.id,
            type: 'list_activity'
          }
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in recordListActivity:', error);
    return false;
  }
};

// Helper function to send push notifications
// This would be implemented with a real push notification service
const sendPushNotification = (userIdOrEmail: string, notification: { 
  title: string;
  body: string;
  data?: any;
}) => {
  // This is a placeholder for actual push notification implementation
  // In a real app, you would use a service like Firebase Cloud Messaging, 
  // OneSignal, or a custom solution with service workers
  console.log(`[PUSH NOTIFICATION to ${userIdOrEmail}]:`, notification);
  
  // For demo purposes, we can use the browser's notification API if available
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      // Check if we have permission to send notifications
      if (Notification.permission === 'granted') {
        // Create and show the notification
        new Notification(notification.title, {
          body: notification.body,
          data: notification.data
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission and show notification if granted
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              data: notification.data
            });
          }
        });
      }
    } catch (error) {
      console.error('Error sending browser notification:', error);
    }
  }
}; 