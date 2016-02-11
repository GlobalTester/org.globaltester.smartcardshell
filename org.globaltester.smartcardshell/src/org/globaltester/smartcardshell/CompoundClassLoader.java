package org.globaltester.smartcardshell;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Iterator;


/**
 * This class loader is used in GT for collecting several class loaders of protocol
 * extensions and create a compound class loader from them. Thus all these classes
 * can be loaded explicitly. This is used e.g.
 * to avoid the "DynamicImport" of classes formerly used in smartcardshell.
 * 
 * The actual loading is executed by the standard method java.lang.ClassLoader.loadClass().
 * 
 * @author akoelzer
 **/
public class CompoundClassLoader extends ClassLoader {
	
	/**
	 * List of class loaders which shall be activated
	 */
	protected final List<ClassLoader> loaderList = Collections.synchronizedList(new ArrayList<ClassLoader>());

    /**
     * Adds some basic class loaders to the {@link #loaderList}
     */
    public CompoundClassLoader() {
    }

    /**
     * Adds a class loader to {@link #loaderList} if it is not already contained
     * @param loader
     */
   	public void addClass(ClassLoader loader) {
        if (loader != null) {
        	if (! loaderList.contains(loader))
        		loaderList.add(0, loader);
        }		
	}
   	
    /** 
     * Loads all classes which were added to {@link #loaderList} using the standard loadClass method.
     * @see java.lang.ClassLoader#loadClass(java.lang.String)
     */
    @Override
    public Class<?> loadClass(String className) throws ClassNotFoundException {
        for (Iterator<ClassLoader> iterator = loaderList.iterator(); iterator.hasNext();) {
            ClassLoader classLoader = iterator.next();
            try {
                return classLoader.loadClass(className);
            } catch (ClassNotFoundException notFound) {
                // nothing special to do
            }
        }
              
        // if loading using the classLoader list above was not successful, use the context
        // class loader from the current thread
        ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        if (contextClassLoader != null) {
            return contextClassLoader.loadClass(className);
        } else {
            throw new ClassNotFoundException(className);
        }
    }
}
