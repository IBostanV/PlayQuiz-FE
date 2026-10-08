import React, { useEffect, useState } from 'react';
import Glossary from './glossary/component';
import Category from './category/component';
import Question from './question/component';
import GlossaryType from './glossary-type/component';
import { Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getManagedCategories } from '../../api/category';
import getByCategoryGlossaries from '../../api/glossary/get-all';
import getGlossaryTypes from '../../api/glossary/get-types';
import getMissingTypeCount, { GLOSSARY_CHANGED } from '../../api/glossary/missing-type-count';
import KnowledgeBaseAdmin from './knowledge-base/component';
import { AdminDashboard } from '../../components/admin/dashboard';
import {
  faBookBookmark, faGraduationCap, faLayerGroup, faListCheck, faTags
} from '@fortawesome/free-solid-svg-icons';

// The content dashboard: the quiz content itself, which the content roles work in alongside
// admins. The admin dashboard at /admin — what players send in, and the accounts
// themselves — stays admin-only.
const ContentDashboardPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [glossaries, setGlossaries] = useState([]);
  const [glossaryTypes, setGlossaryTypes] = useState([]);
  const [glossaryFilter, setGlossaryFilter] = useState(1);

  // How many terms are still without a type, beside the Glossaries entry. A term without one
  // leaves its questions with no plausible wrong options, so they go out short — this is the
  // only place that gap is visible. Saving or deleting a glossary recounts.
  const [missingType, setMissingType] = useState(0);
  useEffect(() => {
    const recount = () => getMissingTypeCount().then(count => setMissingType(count ?? 0));
    recount();
    window.addEventListener(GLOSSARY_CHANGED, recount);
    return () => window.removeEventListener(GLOSSARY_CHANGED, recount);
  }, []);

  const sections = [
    { key: 'category', label: t('content_categories', 'Categories'), icon: faLayerGroup },
    {
      key: 'glosary',
      label: t('content_glossaries', 'Glossaries'),
      icon: faBookBookmark,
      badge: missingType,
      badgeTitle: t('content_without_glossary_type', '{{count}} without a glossary type', { count: missingType }),
    },
    { key: 'glossaryType', label: t('content_glossary_type', 'Glossary type'), icon: faTags },
    { key: 'question', label: t('content_questions', 'Questions'), icon: faListCheck },
    { key: 'knowledge-base', label: t('content_wiki', 'Wiki'), icon: faGraduationCap },
  ];

  useEffect(() => {
    const fetchCategories = async () => await getManagedCategories();
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const fetchGlossaries = async () => await getByCategoryGlossaries(glossaryFilter);
    fetchGlossaries().then(setGlossaries);
  }, [glossaryFilter]);

  useEffect(() => {
    const fetchGlossaryTypes = async () => await getGlossaryTypes();
    fetchGlossaryTypes().then(setGlossaryTypes);
  }, []);

  return (
    <AdminDashboard title={t('content_dashboard', 'Content dashboard')} sections={sections}>
      <Tab.Pane eventKey="category">
        {(<Category categories={categories}
                    setCategories={setCategories}
        />)}
      </Tab.Pane>
      <Tab.Pane eventKey="glosary">
        {(<Glossary
          categories={categories}
          glossaries={glossaries}
          setGlossaries={setGlossaries}
          glossaryTypes={glossaryTypes}
          setGlossaryFilter={setGlossaryFilter}
        />)}
      </Tab.Pane>
      <Tab.Pane eventKey="glossaryType">
        {(<GlossaryType
          glossaryTypes={glossaryTypes}
          setGlossaryTypes={setGlossaryTypes}
        />)}
      </Tab.Pane>
      <Tab.Pane eventKey="question">
        {(<Question
          categories={categories}
          glossaries={glossaries}
          setGlossaryFilter={setGlossaryFilter}
        />)}
      </Tab.Pane>
      <Tab.Pane eventKey="knowledge-base">
        <KnowledgeBaseAdmin
          categories={categories}
        />
      </Tab.Pane>
    </AdminDashboard>
  );
};

export default ContentDashboardPage;
