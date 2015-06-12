package org.globaltester.smartcardshell;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

/**
 * This class loader is used in GT for collecting several class loaders of protocol
 * extensions and create a compound class loader from them. Thus all these classes
 * can be loaded explicitly. This is used e.g.
 * to avoid the "DynamicImport" of classes formerly used in smartcardshell.
   */
public class CompoundClassLoader extends ClassLoader {

    /**
     * Collection of class loaders which shall be activated.
     */
    private final List loaderList = Collections.synchronizedList(new ArrayList());

    public CompoundClassLoader() {
        add(Object.class.getClassLoader()); // standard loader
        add(getClass().getClassLoader()); // class loader for this class
    }

    /**
     * Adds a class loader if it was not already contained in the list of class loaders
     * @param classLoader
     */
    public void add(ClassLoader classLoader) {
        if (classLoader != null) {
        	if (! loaderList.contains(classLoader))
        		loaderList.add(0, classLoader);
        }
    }

    /** 
     * Loads all classes which were added to {@link #loaderList} using the standard loadClass method.
     * @see java.lang.ClassLoader#loadClass(java.lang.String)
     */
    @Override
    public Class loadClass(String name) throws ClassNotFoundException {
        for (Iterator iterator = loaderList.iterator(); iterator.hasNext();) {
            ClassLoader classLoader = (ClassLoader) iterator.next();
            try {
                return classLoader.loadClass(name);
            } catch (ClassNotFoundException notFound) {
                // nothing special to do
            }
        }
        // One more thing to try: the context class loader associated with the current thread. Often used in j2ee servers.
        // Note: The contextClassLoader cannot be added to the classLoaders list as this could be 
        // a different thread
        ClassLoader contextClassLoader = Thread.currentThread().getContextClassLoader();
        if (contextClassLoader != null) {
            return contextClassLoader.loadClass(name);
        } else {
            throw new ClassNotFoundException(name);
        }
    }
}
