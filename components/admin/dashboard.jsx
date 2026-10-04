import React from 'react';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {Col, Nav, Row, Tab} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

/**
 * The rail-and-panes layout both dashboards use: the content one at /content and the admin-only
 * one at /admin. `sections` are the menu entries — `{key, label, icon}`, plus `badge` for a count
 * beside the label and `badgeTitle` for what that count means — and `children` the matching
 * Tab.Panes, keyed by the same `key`. ?tab= opens one directly, as the navbar's links do.
 */
export const AdminDashboard = ({title, sections, children}) => {
    const {t} = useTranslation();
    const {query} = useRouter();
    const opened = sections.some(section => section.key === query.tab) ? query.tab : sections[0].key;

    return (
        <Tab.Container id="admin-dashboard" defaultActiveKey={opened}>
            {/* Bootstrap's dark theme handles inputs/tables; .admin-page adds the cyan accents. */}
            <Row className="admin-page" data-bs-theme="dark">
                <Col md={3} xl={2} className="admin-nav">
                    <nav className="admin-menu" aria-label={t('content_admin_sections', 'Admin sections')}>
                        <h2 className="admin-menu-title">{title}</h2>
                        <Nav variant="pills" className="flex-column">
                            {sections.map(section => (
                                <Nav.Item key={section.key}>
                                    <Nav.Link eventKey={section.key}>
                                        <span className="admin-menu-icon" aria-hidden>
                                            <FontAwesomeIcon icon={section.icon}/>
                                        </span>
                                        <span className="admin-menu-label">{section.label}</span>
                                        {section.badge > 0 && (
                                            <span className="admin-menu-badge"
                                                  title={section.badgeTitle ?? t('content_badge_unresolved', '{{count}} unresolved', {count: section.badge})}>
                                                {section.badge > 99 ? '99+' : section.badge}
                                            </span>
                                        )}
                                    </Nav.Link>
                                </Nav.Item>
                            ))}
                        </Nav>
                    </nav>
                </Col>
                <Col md={9} xl={10}>
                    <Tab.Content>{children}</Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
};
